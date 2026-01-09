import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

/**
 * =========================================================
 * ASAAS WEBHOOK - Processa eventos de TRANSFERÊNCIA (Payout)
 * =========================================================
 * 
 * ARQUITETURA DE PAGAMENTOS:
 * 
 * 🔹 STRIPE - SEMPRE usado para checkout de assinatura
 *    - Todos os usuários pagam via Stripe
 *    - Comissões são calculadas no stripe-webhook
 * 
 * 🔹 ASAAS - APENAS para payout de afiliados
 *    - Cron job chama process-referral-payouts
 *    - Asaas faz PIX/TED para o afiliado
 *    - Este webhook confirma o status da transferência
 * 
 * Eventos processados:
 * - TRANSFER_CREATED: Transferência criada
 * - TRANSFER_PENDING: Transferência pendente
 * - TRANSFER_IN_BANK_PROCESSING: Em processamento bancário
 * - TRANSFER_DONE: Transferência concluída com sucesso ✅
 * - TRANSFER_FAILED: Transferência falhou ❌
 * - TRANSFER_CANCELLED: Transferência cancelada ❌
 * =========================================================
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const event = body.event;
    const transfer = body.transfer;

    console.log(`[asaas-webhook] 📨 Processing event: ${event}`);
    console.log(`[asaas-webhook] 📦 Data:`, JSON.stringify(body, null, 2));

    // Processar eventos de TRANSFER (payout de afiliados)
    switch (event) {
      case 'TRANSFER_CREATED':
      case 'TRANSFER_PENDING':
      case 'TRANSFER_IN_BANK_PROCESSING': {
        await handleTransferProcessing(transfer);
        break;
      }

      case 'TRANSFER_DONE': {
        await handleTransferCompleted(transfer);
        break;
      }

      case 'TRANSFER_FAILED':
      case 'TRANSFER_CANCELLED': {
        await handleTransferFailed(transfer, event);
        break;
      }

      // =========================================================
      // EVENTOS DE PAGAMENTO (legado - não mais usados para assinaturas)
      // Mantidos para compatibilidade caso existam assinaturas antigas
      // =========================================================
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        console.log('[asaas-webhook] ⚠️ Payment event received (legacy) - payments should go through Stripe');
        break;
      }

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED': {
        console.log('[asaas-webhook] ⚠️ Refund/delete event received (legacy)');
        break;
      }

      default:
        console.log(`[asaas-webhook] ℹ️ Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[asaas-webhook] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

/**
 * Transferência em processamento
 */
async function handleTransferProcessing(transfer: any) {
  if (!transfer?.id) {
    console.log('[asaas-webhook] ⚠️ Transfer without ID');
    return;
  }

  console.log('[asaas-webhook] 🔄 Transfer processing:', transfer.id);

  // Atualizar status do payout para 'processing'
  const { data: payout, error } = await supabase
    .from('referral_payouts')
    .update({ 
      status: 'processing',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_transfer_id', transfer.id)
    .select()
    .single();

  if (error) {
    console.log('[asaas-webhook] ℹ️ Payout not found for transfer:', transfer.id);
    return;
  }

  console.log('[asaas-webhook] ✅ Payout status updated to processing:', payout.id);
}

/**
 * Transferência concluída com sucesso
 */
async function handleTransferCompleted(transfer: any) {
  if (!transfer?.id) {
    console.log('[asaas-webhook] ⚠️ Transfer without ID');
    return;
  }

  console.log('[asaas-webhook] ✅ Transfer completed:', transfer.id);

  // Buscar e atualizar o payout
  const { data: payout, error } = await supabase
    .from('referral_payouts')
    .update({ 
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('asaas_transfer_id', transfer.id)
    .select('*, referrer_user_id')
    .single();

  if (error) {
    console.log('[asaas-webhook] ℹ️ Payout not found for transfer:', transfer.id);
    return;
  }

  console.log('[asaas-webhook] ✅ Payout marked as paid:', payout.id);

  // Notificar afiliado
  const amountFormatted = (payout.amount / 100).toFixed(2).replace('.', ',');
  
  await supabase
    .from('notifications')
    .insert({
      user_id: payout.referrer_user_id,
      titulo: 'Pagamento Confirmado! 💰',
      conteudo: `Sua comissão de R$ ${amountFormatted} foi depositada com sucesso na sua conta.`
    });

  // Log de auditoria
  await supabase.from('referral_audit_log').insert({
    action: 'payout_completed',
    referrer_user_id: payout.referrer_user_id,
    payout_id: payout.id,
    gateway: 'asaas',
    gateway_payment_id: transfer.id,
    commission_amount: payout.amount,
    status: 'success',
    metadata: { 
      transfer_status: 'DONE',
      transfer_value: transfer.value
    }
  });
}

/**
 * Transferência falhou ou foi cancelada
 */
async function handleTransferFailed(transfer: any, event: string) {
  if (!transfer?.id) {
    console.log('[asaas-webhook] ⚠️ Transfer without ID');
    return;
  }

  console.log('[asaas-webhook] ❌ Transfer failed:', transfer.id, 'Event:', event);

  const failureReason = transfer.failReason || 
                        transfer.bankProcessingDescription || 
                        (event === 'TRANSFER_CANCELLED' ? 'Transferência cancelada' : 'Falha na transferência');

  // Atualizar payout como falho
  const { data: payout, error } = await supabase
    .from('referral_payouts')
    .update({ 
      status: 'failed',
      failure_reason: failureReason,
      updated_at: new Date().toISOString()
    })
    .eq('asaas_transfer_id', transfer.id)
    .select('*, referrer_user_id')
    .single();

  if (error) {
    console.log('[asaas-webhook] ℹ️ Payout not found for transfer:', transfer.id);
    return;
  }

  console.log('[asaas-webhook] ❌ Payout marked as failed:', payout.id);

  // Notificar afiliado
  const amountFormatted = (payout.amount / 100).toFixed(2).replace('.', ',');
  
  await supabase
    .from('notifications')
    .insert({
      user_id: payout.referrer_user_id,
      titulo: 'Falha no Pagamento',
      conteudo: `Houve um problema ao transferir sua comissão de R$ ${amountFormatted}. Motivo: ${failureReason}. Por favor, verifique seus dados bancários.`
    });

  // Log de auditoria
  await supabase.from('referral_audit_log').insert({
    action: 'payout_failed',
    referrer_user_id: payout.referrer_user_id,
    payout_id: payout.id,
    gateway: 'asaas',
    gateway_payment_id: transfer.id,
    commission_amount: payout.amount,
    status: 'failed',
    failure_reason: failureReason,
    metadata: { 
      transfer_status: event,
      transfer_value: transfer.value,
      bank_processing_description: transfer.bankProcessingDescription
    }
  });
}