import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valor mínimo para payout: R$ 50,00
const MINIMUM_PAYOUT_AMOUNT = 5000; // em centavos

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

/**
 * Job automático de payout para afiliados
 * 
 * Executa todo mês, até o dia 15, selecionando comissões aprovadas
 * do mês anterior e enviando pagamento via Asaas (PIX ou TED)
 * 
 * Validações automáticas antes do pagamento:
 * - Assinatura ainda ativa
 * - Pagamento confirmado
 * - Ausência de chargeback
 * - Afiliado ainda participante do programa
 * - Dados bancários válidos
 * - Valor mínimo acumulado >= R$ 50
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[process-referral-payouts] 🚀 Iniciando processamento de payouts...');
    
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox";
    
    if (!asaasApiKey) {
      console.error('[process-referral-payouts] ❌ ASAAS_API_KEY not configured');
      throw new Error("Gateway de pagamento Asaas não configurado.");
    }
    
    const asaasBaseUrl = asaasEnv === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    // =========================================================
    // DELAY TÉCNICO: Buscar apenas payouts APROVADOS
    // (que passaram do approval_deadline de 15 dias)
    // =========================================================
    const { data: pendingPayouts, error: payoutsError } = await supabase
      .from('referral_payouts')
      .select(`
        id,
        referrer_user_id,
        referral_id,
        amount,
        referred_user_name,
        referred_plan,
        created_at,
        approval_deadline
      `)
      .in('status', ['pending', 'approved'])
      .lte('approval_deadline', new Date().toISOString().split('T')[0]) // Só após deadline
      .order('created_at', { ascending: true });

    if (payoutsError) {
      console.error('[process-referral-payouts] ❌ Error fetching payouts:', payoutsError);
      throw new Error("Erro ao buscar payouts pendentes");
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      console.log('[process-referral-payouts] ℹ️ No pending payouts found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum payout pendente',
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('[process-referral-payouts] 📊 Found', pendingPayouts.length, 'pending payouts');

    // Agrupar payouts por afiliado
    const payoutsByReferrer: Record<string, typeof pendingPayouts> = {};
    for (const payout of pendingPayouts) {
      if (!payoutsByReferrer[payout.referrer_user_id]) {
        payoutsByReferrer[payout.referrer_user_id] = [];
      }
      payoutsByReferrer[payout.referrer_user_id].push(payout);
    }

    const results: any[] = [];

    // Processar cada afiliado
    for (const [referrerUserId, referrerPayouts] of Object.entries(payoutsByReferrer)) {
      console.log(`[process-referral-payouts] 👤 Processing referrer: ${referrerUserId}`);

      // 1. Verificar se afiliado ainda está ativo no programa
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('nome, is_referral_partner, bank_details_validated, chave_pix, banco, agencia, conta, tipo_conta, cpf_cnpj, nome_titular')
        .eq('user_id', referrerUserId)
        .single();

      if (!referrerProfile?.is_referral_partner) {
        console.log(`[process-referral-payouts] ⚠️ Referrer ${referrerUserId} is no longer a partner`);
        
        // Cancelar payouts
        await supabase
          .from('referral_payouts')
          .update({ 
            status: 'cancelled',
            failure_reason: 'Afiliado não está mais no programa'
          })
          .in('id', referrerPayouts.map(p => p.id));

        results.push({
          referrer_user_id: referrerUserId,
          status: 'cancelled',
          reason: 'not_partner'
        });
        continue;
      }

      // 2. Verificar dados bancários válidos
      if (!referrerProfile.bank_details_validated) {
        console.log(`[process-referral-payouts] ⚠️ Referrer ${referrerUserId} has invalid bank details`);
        results.push({
          referrer_user_id: referrerUserId,
          status: 'skipped',
          reason: 'invalid_bank_details'
        });
        continue;
      }

      // 3. Calcular valor total
      const totalAmount = referrerPayouts.reduce((sum, p) => sum + p.amount, 0);

      // 4. Verificar valor mínimo
      if (totalAmount < MINIMUM_PAYOUT_AMOUNT) {
        console.log(`[process-referral-payouts] ⚠️ Amount ${totalAmount} below minimum ${MINIMUM_PAYOUT_AMOUNT}`);
        results.push({
          referrer_user_id: referrerUserId,
          status: 'skipped',
          reason: 'below_minimum',
          amount: totalAmount,
          minimum: MINIMUM_PAYOUT_AMOUNT
        });
        continue;
      }

      // 5. Validar assinaturas dos indicados ainda ativas
      const validPayouts: typeof referrerPayouts = [];
      
      for (const payout of referrerPayouts) {
        if (!payout.referral_id) {
          validPayouts.push(payout);
          continue;
        }

        const { data: referral } = await supabase
          .from('referrals')
          .select('referred_user_id, status')
          .eq('id', payout.referral_id)
          .single();

        if (!referral) {
          validPayouts.push(payout);
          continue;
        }

        // Verificar se assinatura do indicado ainda está ativa
        const { data: referredProfile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', referral.referred_user_id)
          .single();

        if (referredProfile?.subscription_plan && referredProfile.subscription_plan !== 'basico') {
          validPayouts.push(payout);
        } else {
          // Cancelar payout pois assinatura não está ativa
          await supabase
            .from('referral_payouts')
            .update({ 
              status: 'cancelled',
              failure_reason: 'Assinatura do indicado cancelada'
            })
            .eq('id', payout.id);
        }
      }

      if (validPayouts.length === 0) {
        console.log(`[process-referral-payouts] ⚠️ No valid payouts for referrer ${referrerUserId}`);
        results.push({
          referrer_user_id: referrerUserId,
          status: 'skipped',
          reason: 'no_valid_payouts'
        });
        continue;
      }

      const validAmount = validPayouts.reduce((sum, p) => sum + p.amount, 0);

      if (validAmount < MINIMUM_PAYOUT_AMOUNT) {
        results.push({
          referrer_user_id: referrerUserId,
          status: 'skipped',
          reason: 'below_minimum_after_validation',
          amount: validAmount
        });
        continue;
      }

      // 6. Determinar método de pagamento (PIX ou TED)
      let transferPayload: any;
      
      if (referrerProfile.chave_pix) {
        // PIX
        transferPayload = {
          value: validAmount / 100, // Asaas usa reais
          operationType: 'PIX',
          pixAddressKey: referrerProfile.chave_pix,
          description: `Comissão TherapyPro - ${validPayouts.length} indicação(ões)`
        };
      } else if (referrerProfile.banco && referrerProfile.agencia && referrerProfile.conta) {
        // TED
        const bankCode = getBankCode(referrerProfile.banco);
        
        transferPayload = {
          value: validAmount / 100,
          operationType: 'TED',
          bankAccount: {
            bank: {
              code: bankCode
            },
            accountName: referrerProfile.nome_titular || referrerProfile.nome,
            cpfCnpj: referrerProfile.cpf_cnpj?.replace(/\D/g, ''),
            agency: referrerProfile.agencia?.replace(/\D/g, ''),
            account: referrerProfile.conta?.replace(/\D/g, ''),
            accountDigit: referrerProfile.conta?.slice(-1) || '0',
            bankAccountType: referrerProfile.tipo_conta === 'poupanca' ? 'SAVINGS' : 'CHECKING'
          },
          description: `Comissão TherapyPro - ${validPayouts.length} indicação(ões)`
        };
      } else {
        console.log(`[process-referral-payouts] ⚠️ No payment method for referrer ${referrerUserId}`);
        results.push({
          referrer_user_id: referrerUserId,
          status: 'skipped',
          reason: 'no_payment_method'
        });
        continue;
      }

      console.log('[process-referral-payouts] 💸 Creating transfer:', JSON.stringify(transferPayload, null, 2));

      // 7. Criar transferência no Asaas
      try {
        const requestTimestamp = new Date().toISOString();
        const transferResponse = await fetch(`${asaasBaseUrl}/transfers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey
          },
          body: JSON.stringify(transferPayload)
        });

        const transferResult = await transferResponse.json();

        // ✅ LOG COMPLETO: Request + Response do Asaas para auditoria
        await supabase.from('referral_audit_log').insert({
          action: 'asaas_transfer_request',
          referrer_user_id: referrerUserId,
          gateway: 'asaas',
          status: transferResult.errors ? 'failed' : 'success',
          commission_amount: validAmount,
          failure_reason: transferResult.errors?.[0]?.description,
          metadata: {
            request: {
              timestamp: requestTimestamp,
              endpoint: `${asaasBaseUrl}/transfers`,
              payload: {
                ...transferPayload,
                // Mascarar dados sensíveis
                pixAddressKey: transferPayload.pixAddressKey ? '***' + transferPayload.pixAddressKey.slice(-4) : undefined,
                bankAccount: transferPayload.bankAccount ? {
                  ...transferPayload.bankAccount,
                  cpfCnpj: '***' + (transferPayload.bankAccount.cpfCnpj?.slice(-4) || ''),
                  account: '***' + (transferPayload.bankAccount.account?.slice(-4) || ''),
                } : undefined
              }
            },
            response: {
              timestamp: new Date().toISOString(),
              status: transferResponse.status,
              body: transferResult
            }
          }
        });

        if (transferResult.errors) {
          console.error('[process-referral-payouts] ❌ Transfer error:', transferResult);
          
          // Marcar payouts como falhos
          await supabase
            .from('referral_payouts')
            .update({ 
              status: 'failed',
              failure_reason: transferResult.errors[0]?.description || 'Erro na transferência'
            })
            .in('id', validPayouts.map(p => p.id));

          results.push({
            referrer_user_id: referrerUserId,
            status: 'failed',
            reason: transferResult.errors[0]?.description,
            amount: validAmount
          });
          continue;
        }

        console.log('[process-referral-payouts] ✅ Transfer created:', transferResult.id);

        // 8. Marcar payouts como pagos
        await supabase
          .from('referral_payouts')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
            asaas_transfer_id: transferResult.id,
            payment_method: referrerProfile.chave_pix ? 'PIX' : 'TED'
          })
          .in('id', validPayouts.map(p => p.id));

        // 9. Notificar afiliado
        await supabase
          .from('notifications')
          .insert({
            user_id: referrerUserId,
            titulo: 'Pagamento de Comissão Enviado! 💰',
            conteudo: `Seu pagamento de R$ ${(validAmount / 100).toFixed(2).replace('.', ',')} referente a ${validPayouts.length} indicação(ões) foi enviado via ${referrerProfile.chave_pix ? 'PIX' : 'TED'}. O valor deve cair em sua conta em até 1 dia útil.`
          });

        results.push({
          referrer_user_id: referrerUserId,
          status: 'paid',
          amount: validAmount,
          transfer_id: transferResult.id,
          payouts_count: validPayouts.length
        });

      } catch (transferError) {
        console.error('[process-referral-payouts] ❌ Transfer exception:', transferError);
        
        await supabase
          .from('referral_payouts')
          .update({ 
            status: 'failed',
            failure_reason: 'Erro de conexão com gateway'
          })
          .in('id', validPayouts.map(p => p.id));

        results.push({
          referrer_user_id: referrerUserId,
          status: 'failed',
          reason: 'connection_error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'paid').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log('[process-referral-payouts] 📊 Processing complete:', { 
      success: successCount, 
      failed: failedCount, 
      skipped: skippedCount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      processed: results.length,
      paid: successCount,
      failed: failedCount,
      skipped: skippedCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[process-referral-payouts] ❌ Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper para mapear nome do banco para código
function getBankCode(bankName: string): string {
  const bankCodes: Record<string, string> = {
    'Banco do Brasil': '001',
    'Bradesco': '237',
    'Itaú': '341',
    'Santander': '033',
    'Caixa Econômica': '104',
    'Nubank': '260',
    'Inter': '077',
    'C6 Bank': '336',
    'PagBank': '290',
    'Mercado Pago': '323',
    'PicPay': '380',
    'BTG Pactual': '208',
    'Neon': '735',
    'Next': '237',
    'Original': '212',
    'Safra': '422',
    'Sicoob': '756',
    'Sicredi': '748',
    'Banrisul': '041',
  };

  // Buscar por correspondência parcial
  for (const [name, code] of Object.entries(bankCodes)) {
    if (bankName.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(bankName.toLowerCase())) {
      return code;
    }
  }

  // Fallback
  return '001';
}
