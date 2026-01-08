import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_PAYOUT_AMOUNT = 5000; // R$ 50,00 em centavos

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox";

    if (!asaasApiKey) {
      console.error('[referral-process-payout-asaas] ASAAS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "Asaas API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asaasBaseUrl = asaasEnv === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const { payout_id } = body;

    let payoutsToProcess = [];

    if (payout_id) {
      // Process specific payout
      const { data: payout, error } = await supabase
        .from("referral_payouts")
        .select("*")
        .eq("id", payout_id)
        .single();

      if (error || !payout) {
        return new Response(
          JSON.stringify({ error: "Payout not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payoutsToProcess = [payout];
    } else {
      // Process all pending approved payouts
      const { data: pendingPayouts, error } = await supabase
        .from("referral_payouts")
        .select("*")
        .eq("status", "approved")
        .gte("amount", MINIMUM_PAYOUT_AMOUNT);

      if (error) {
        console.error('[referral-process-payout-asaas] Error fetching payouts:', error);
        return new Response(
          JSON.stringify({ error: "Error fetching payouts" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payoutsToProcess = pendingPayouts || [];
    }

    const results = [];

    for (const payout of payoutsToProcess) {
      try {
        // Get user's bank details
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("nome_titular, cpf_cnpj, banco, agencia, conta, tipo_conta, chave_pix, bank_details_validated, tipo_pessoa")
          .eq("user_id", payout.referrer_user_id)
          .single();

        if (profileError || !profile) {
          console.error('[referral-process-payout-asaas] Profile not found for user:', payout.referrer_user_id);
          await updatePayoutStatus(supabase, payout.id, 'failed', 'Perfil não encontrado');
          results.push({ payout_id: payout.id, status: 'failed', reason: 'Profile not found' });
          continue;
        }

        if (!profile.bank_details_validated) {
          console.error('[referral-process-payout-asaas] Bank details not validated for user:', payout.referrer_user_id);
          await updatePayoutStatus(supabase, payout.id, 'failed', 'Dados bancários não validados');
          results.push({ payout_id: payout.id, status: 'failed', reason: 'Bank details not validated' });
          continue;
        }

        // Update status to processing
        await updatePayoutStatus(supabase, payout.id, 'processing');

        // Determine payment method - prefer PIX if available
        const paymentMethod = profile.chave_pix ? 'pix' : 'ted';
        const amountInReais = payout.amount / 100;

        // Create transfer in Asaas
        const transferPayload: any = {
          value: amountInReais,
          description: `Comissão de indicação - ${payout.referred_user_name || 'Indicado'}`,
        };

        if (paymentMethod === 'pix' && profile.chave_pix) {
          transferPayload.operationType = "PIX";
          transferPayload.pixAddressKey = profile.chave_pix;
        } else {
          transferPayload.operationType = "TED";
          transferPayload.bankAccount = {
            bank: {
              code: getBankCode(profile.banco) || profile.banco,
            },
            accountName: profile.nome_titular,
            ownerName: profile.nome_titular,
            cpfCnpj: profile.cpf_cnpj,
            agency: profile.agencia.replace(/\D/g, ''),
            account: profile.conta.replace(/\D/g, ''),
            accountDigit: profile.conta.includes('-') ? profile.conta.split('-')[1] : '0',
            bankAccountType: profile.tipo_conta === 'poupanca' ? 'CONTA_POUPANCA' : 'CONTA_CORRENTE',
          };
        }

        console.log('[referral-process-payout-asaas] Creating transfer:', JSON.stringify(transferPayload, null, 2));

        const transferResponse = await fetch(`${asaasBaseUrl}/transfers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": asaasApiKey,
          },
          body: JSON.stringify(transferPayload),
        });

        const transferResult = await transferResponse.json();

        if (!transferResponse.ok || transferResult.errors) {
          const errorMessage = transferResult.errors?.[0]?.description || 'Erro na transferência Asaas';
          console.error('[referral-process-payout-asaas] Transfer error:', transferResult);
          await updatePayoutStatus(supabase, payout.id, 'failed', errorMessage);
          results.push({ payout_id: payout.id, status: 'failed', reason: errorMessage });
          continue;
        }

        // Update payout as paid
        await supabase
          .from("referral_payouts")
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            asaas_transfer_id: transferResult.id,
            payment_method: paymentMethod,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout.id);

        // Create notification for the user
        await supabase
          .from("notifications")
          .insert({
            user_id: payout.referrer_user_id,
            titulo: "Pagamento de comissão realizado!",
            conteudo: `Sua comissão de R$ ${amountInReais.toFixed(2).replace('.', ',')} foi transferida via ${paymentMethod.toUpperCase()}.`,
          });

        console.log('[referral-process-payout-asaas] Transfer successful:', transferResult.id);
        results.push({ 
          payout_id: payout.id, 
          status: 'paid', 
          transfer_id: transferResult.id,
          amount: amountInReais,
          method: paymentMethod
        });
      } catch (error) {
        console.error('[referral-process-payout-asaas] Error processing payout:', payout.id, error);
        await updatePayoutStatus(supabase, payout.id, 'failed', error.message);
        results.push({ payout_id: payout.id, status: 'failed', reason: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.filter(r => r.status === 'paid').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[referral-process-payout-asaas] Error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updatePayoutStatus(supabase: any, payoutId: string, status: string, failureReason?: string) {
  const update: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (failureReason) {
    update.failure_reason = failureReason;
  }
  await supabase
    .from("referral_payouts")
    .update(update)
    .eq("id", payoutId);
}

// Map common bank names to Asaas bank codes
function getBankCode(bankName: string): string | null {
  const bankCodes: Record<string, string> = {
    'banco do brasil': '001',
    'bb': '001',
    'bradesco': '237',
    'itau': '341',
    'itaú': '341',
    'santander': '033',
    'caixa': '104',
    'cef': '104',
    'caixa economica': '104',
    'caixa econômica': '104',
    'nubank': '260',
    'inter': '077',
    'banco inter': '077',
    'c6': '336',
    'c6 bank': '336',
    'original': '212',
    'banco original': '212',
    'neon': '735',
    'next': '237',
    'pagbank': '290',
    'pagseguro': '290',
    'mercado pago': '323',
    'picpay': '380',
    'sicoob': '756',
    'sicredi': '748',
    'banrisul': '041',
    'safra': '422',
    'btg': '208',
    'btg pactual': '208',
    'modal': '746',
    'banco modal': '746',
  };

  const normalized = bankName.toLowerCase().trim();
  return bankCodes[normalized] || null;
}
