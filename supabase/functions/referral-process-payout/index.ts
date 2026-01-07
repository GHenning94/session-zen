import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[referral-process-payout] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Este endpoint pode ser chamado por webhook ou manualmente (admin)
    const body = await req.json().catch(() => ({}));
    const { payout_id } = body;

    if (payout_id) {
      // Processar um payout específico
      const { data: payout, error } = await supabase
        .from('referral_payouts')
        .select('*, stripe_connect_accounts!inner(*)')
        .eq('id', payout_id)
        .eq('status', 'pending')
        .single();

      if (error || !payout) {
        throw new Error('Payout not found or already processed');
      }

      // Processar transferência
      const result = await processTransfer(stripe, supabase, payout);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Processar todos os payouts pendentes (batch)
      const { data: pendingPayouts } = await supabase
        .from('referral_payouts')
        .select('*')
        .eq('status', 'pending');

      if (!pendingPayouts || pendingPayouts.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No pending payouts to process',
          processed: 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;
      let failed = 0;
      const results: any[] = [];

      for (const payout of pendingPayouts) {
        try {
          // Buscar conta Connect
          const { data: connectAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('*')
            .eq('user_id', payout.referrer_user_id)
            .single();

          if (!connectAccount || !connectAccount.payouts_enabled) {
            logStep("Skipping payout - account not ready", { payoutId: payout.id });
            results.push({ id: payout.id, status: 'skipped', reason: 'Account not ready' });
            continue;
          }

          const result = await processTransfer(stripe, supabase, { ...payout, stripe_connect_accounts: connectAccount });
          processed++;
          results.push({ id: payout.id, ...result });
        } catch (err: any) {
          failed++;
          results.push({ id: payout.id, status: 'failed', error: err.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        processed,
        failed,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("[referral-process-payout] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processTransfer(stripe: Stripe, supabase: any, payout: any) {
  const connectAccountId = payout.stripe_connect_accounts?.stripe_account_id;
  
  if (!connectAccountId) {
    throw new Error('No Connect account found');
  }

  if (!payout.stripe_connect_accounts?.payouts_enabled) {
    throw new Error('Payouts not enabled for this account');
  }

  logStep("Processing transfer", {
    payoutId: payout.id,
    amount: payout.amount,
    connectAccountId,
  });

  // Marcar como processing
  await supabase
    .from('referral_payouts')
    .update({ status: 'processing' })
    .eq('id', payout.id);

  try {
    // Criar transferência no Stripe
    const transfer = await stripe.transfers.create({
      amount: payout.amount, // já está em centavos
      currency: payout.currency || 'brl',
      destination: connectAccountId,
      description: `Comissão de indicação - ${payout.referred_user_name || 'TherapyPro'}`,
      metadata: {
        payout_id: payout.id,
        referrer_user_id: payout.referrer_user_id,
        platform: 'therapypro',
      },
    });

    logStep("Transfer created", { transferId: transfer.id });

    // Atualizar payout como pago
    await supabase
      .from('referral_payouts')
      .update({
        status: 'paid',
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payout.id);

    // Criar notificação para o usuário
    await supabase
      .from('notifications')
      .insert({
        user_id: payout.referrer_user_id,
        titulo: 'Comissão Recebida! 💰',
        conteudo: `Você recebeu R$ ${(payout.amount / 100).toFixed(2)} de comissão por indicação. O valor será transferido para sua conta bancária em breve.`,
      });

    return {
      success: true,
      status: 'paid',
      transfer_id: transfer.id,
    };
  } catch (err: any) {
    logStep("Transfer failed", { error: err.message });

    // Marcar como falhou
    await supabase
      .from('referral_payouts')
      .update({
        status: 'failed',
        failure_reason: err.message,
      })
      .eq('id', payout.id);

    throw err;
  }
}
