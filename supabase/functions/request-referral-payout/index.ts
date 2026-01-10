import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valor mínimo para payout: R$ 50,00
const MINIMUM_PAYOUT_AMOUNT = 5000; // em centavos

/**
 * Endpoint para SOLICITAR SAQUE de comissões disponíveis
 * 
 * Fluxo:
 * 1. Usuário clica "Solicitar Saque"
 * 2. Valida: saldo ≥ R$50, dados bancários válidos, não bloqueado
 * 3. Marca payouts como 'requested'
 * 4. Cron job processa e envia via Asaas
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) throw new Error("Authentication failed");
    console.log("[request-referral-payout] 👤 User authenticated:", user.id);

    // 1. Verificar se usuário é parceiro ativo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_referral_partner, bank_details_validated, chave_pix, banco, agencia, conta, nome')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado");
    }

    if (!profile.is_referral_partner) {
      throw new Error("Você não está no programa de indicação");
    }

    // 2. Verificar dados bancários
    const hasBankDetails = !!(profile.chave_pix || (profile.banco && profile.agencia && profile.conta));
    if (!hasBankDetails) {
      throw new Error("Complete seus dados bancários antes de solicitar saque");
    }

    if (!profile.bank_details_validated) {
      throw new Error("Seus dados bancários precisam ser validados antes de solicitar saque");
    }

    // 3. Buscar payouts disponíveis
    const { data: availablePayouts, error: payoutsError } = await supabase
      .from('referral_payouts')
      .select('id, amount')
      .eq('referrer_user_id', user.id)
      .eq('status', 'available');

    if (payoutsError) {
      throw new Error("Erro ao buscar comissões disponíveis");
    }

    if (!availablePayouts || availablePayouts.length === 0) {
      throw new Error("Nenhuma comissão disponível para saque");
    }

    // 4. Calcular valor total
    const totalAmount = availablePayouts.reduce((sum, p) => sum + p.amount, 0);

    if (totalAmount < MINIMUM_PAYOUT_AMOUNT) {
      const minFormatted = (MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2).replace('.', ',');
      const currentFormatted = (totalAmount / 100).toFixed(2).replace('.', ',');
      throw new Error(`Valor mínimo para saque: R$ ${minFormatted}. Seu saldo disponível: R$ ${currentFormatted}`);
    }

    // 5. Marcar payouts como 'requested'
    const payoutIds = availablePayouts.map(p => p.id);
    
    const { error: updateError } = await supabase
      .from('referral_payouts')
      .update({ 
        status: 'requested',
        updated_at: new Date().toISOString()
      })
      .in('id', payoutIds);

    if (updateError) {
      throw new Error("Erro ao solicitar saque");
    }

    console.log(`[request-referral-payout] ✅ Requested payout for ${payoutIds.length} commissions, total: R$ ${(totalAmount / 100).toFixed(2)}`);

    // 6. Criar notificação
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        titulo: 'Saque Solicitado! 💸',
        conteudo: `Sua solicitação de saque de R$ ${(totalAmount / 100).toFixed(2).replace('.', ',')} foi recebida. O pagamento será processado em até 1 dia útil via ${profile.chave_pix ? 'PIX' : 'TED'}.`
      });

    // 7. Log de auditoria
    await supabase.from('referral_audit_log').insert({
      action: 'payout_requested',
      referrer_user_id: user.id,
      status: 'requested',
      commission_amount: totalAmount,
      metadata: {
        payout_ids: payoutIds,
        payment_method: profile.chave_pix ? 'PIX' : 'TED',
        requested_at: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Saque solicitado com sucesso',
      amount: totalAmount,
      payout_count: payoutIds.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[request-referral-payout] ❌ Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
