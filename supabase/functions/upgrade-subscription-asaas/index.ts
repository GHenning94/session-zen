import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preços em centavos
const PRICE_MAP: Record<string, { plan: string; interval: string; priceInCents: number; name: string }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', priceInCents: 2990, name: 'Plano Profissional Mensal' },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', priceInCents: 29880, name: 'Plano Profissional Anual' },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', priceInCents: 4990, name: 'Plano Premium Mensal' },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', priceInCents: 49896, name: 'Plano Premium Anual' }
};

// Taxas de comissão do programa de indicação
const RECURRING_MONTHLY_COMMISSION_RATE = 0.15; // 15% meses seguintes mensal
const ANNUAL_COMMISSION_RATE = 0.20; // 20% anual

// Taxa do gateway Asaas (aproximada para cálculo de comissão)
const ASAAS_FEE_RATE = 0.0299; // 2.99% + R$0.49 por transação
const ASAAS_FIXED_FEE = 49; // R$0.49 em centavos

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[upgrade-subscription-asaas] 🚀 Iniciando upgrade via Asaas...');
    
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox";
    
    if (!asaasApiKey) {
      throw new Error("Gateway de pagamento Asaas não configurado.");
    }
    
    const asaasBaseUrl = asaasEnv === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    console.log("[upgrade-subscription-asaas] ✅ User authenticated:", user.id);

    const { newPriceId } = await req.json();

    if (!newPriceId) {
      throw new Error("newPriceId é obrigatório.");
    }

    const newPriceInfo = PRICE_MAP[newPriceId];
    if (!newPriceInfo) {
      throw new Error(`Price ID inválido: ${newPriceId}`);
    }

    console.log("[upgrade-subscription-asaas] 💳 Upgrading to:", newPriceInfo);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nome, subscription_plan, billing_interval, subscription_end_date')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error("Perfil não encontrado.");
    }

    const currentPlan = profile.subscription_plan || 'basico';
    const currentInterval = profile.billing_interval || 'monthly';
    const subscriptionEndDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;

    // Determinar preço atual
    let currentPriceInfo: { plan: string; interval: string; priceInCents: number } | null = null;
    for (const [, info] of Object.entries(PRICE_MAP)) {
      if (info.plan === currentPlan && info.interval === currentInterval) {
        currentPriceInfo = info;
        break;
      }
    }

    if (!currentPriceInfo) {
      throw new Error("Você precisa ter uma assinatura paga ativa para fazer upgrade.");
    }

    // Calcular proration
    const now = new Date();
    let daysRemaining = 0;
    const totalDaysInPeriod = currentInterval === 'yearly' ? 365 : 30;
    
    if (subscriptionEndDate && subscriptionEndDate > now) {
      daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calcular crédito proporcional do plano atual
    const dailyRateCurrent = currentPriceInfo.priceInCents / totalDaysInPeriod;
    const creditAmount = Math.round(dailyRateCurrent * daysRemaining);

    // Calcular valor proporcional do novo plano
    const totalDaysNewPeriod = newPriceInfo.interval === 'yearly' ? 365 : 30;
    const dailyRateNew = newPriceInfo.priceInCents / totalDaysNewPeriod;
    const newPlanProportional = Math.round(dailyRateNew * daysRemaining);
    
    // Valor final a cobrar
    const proratedAmount = Math.max(0, newPlanProportional - creditAmount);

    console.log("[upgrade-subscription-asaas] 💰 Proration:", {
      creditAmount: creditAmount / 100,
      newPlanProportional: newPlanProportional / 100,
      proratedAmount: proratedAmount / 100,
      daysRemaining
    });

    // Buscar cliente Asaas pelo email
    const searchResponse = await fetch(`${asaasBaseUrl}/customers?email=${encodeURIComponent(user.email!)}`, {
      headers: { "access_token": asaasApiKey }
    });
    const searchResult = await searchResponse.json();
    
    let asaasCustomerId: string | null = null;
    if (searchResult.data && searchResult.data.length > 0) {
      asaasCustomerId = searchResult.data[0].id;
    }

    if (!asaasCustomerId) {
      throw new Error("Cliente não encontrado no Asaas. Entre em contato com o suporte.");
    }

    let paymentUrl: string | null = null;
    let requiresPayment = proratedAmount > 0;

    // Se há valor a pagar, criar cobrança avulsa
    if (requiresPayment) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const chargePayload = {
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: proratedAmount / 100,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Upgrade para ${newPriceInfo.name} (valor proporcional)`,
        externalReference: JSON.stringify({
          user_id: user.id,
          type: 'upgrade_proration',
          previous_plan: currentPlan,
          new_plan: newPriceInfo.plan,
          new_interval: newPriceInfo.interval,
          proration_credit: creditAmount,
          proration_charge: proratedAmount,
          days_remaining: daysRemaining
        }),
      };

      console.log("[upgrade-subscription-asaas] 📝 Creating proration charge:", chargePayload);

      const chargeResponse = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(chargePayload),
      });

      const chargeResult = await chargeResponse.json();

      if (chargeResult.errors) {
        console.error('[upgrade-subscription-asaas] ❌ Error creating charge:', chargeResult);
        throw new Error(chargeResult.errors[0]?.description || "Erro ao criar cobrança.");
      }

      console.log("[upgrade-subscription-asaas] ✅ Proration charge created:", chargeResult.id);
      paymentUrl = chargeResult.invoiceUrl || chargeResult.bankSlipUrl;
      
      // Se não houver URL, construir a URL do checkout
      if (!paymentUrl) {
        const baseCheckoutUrl = asaasEnv === "production" 
          ? "https://www.asaas.com/c" 
          : "https://sandbox.asaas.com/c";
        paymentUrl = `${baseCheckoutUrl}/${chargeResult.id}`;
      }
    }

    // Verificar se usuário é indicado para calcular comissão
    const { data: referralData } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_user_id, first_payment_date')
      .eq('referred_user_id', user.id)
      .single();

    // Log da ação de upgrade
    const logPayload: any = {
      action: 'upgrade',
      referred_user_id: user.id,
      gateway: 'asaas',
      gateway_customer_id: asaasCustomerId,
      gross_amount: proratedAmount,
      previous_plan: currentPlan,
      new_plan: newPriceInfo.plan,
      billing_interval: newPriceInfo.interval,
      proration_credit: creditAmount,
      proration_charge: proratedAmount,
      days_remaining: daysRemaining,
      status: requiresPayment ? 'pending' : 'success',
      metadata: {
        current_interval: currentInterval,
        subscription_end_date: subscriptionEndDate?.toISOString()
      }
    };

    if (referralData) {
      logPayload.referrer_user_id = referralData.referrer_user_id;
      logPayload.referral_id = referralData.id;

      // Calcular comissão sobre o valor efetivamente pago
      if (proratedAmount > 0) {
        // Calcular taxa do gateway
        const gatewayFee = Math.round(proratedAmount * ASAAS_FEE_RATE) + ASAAS_FIXED_FEE;
        const netAmount = proratedAmount - gatewayFee;
        
        // Comissão é calculada sobre o valor líquido
        const isAnnual = newPriceInfo.interval === 'yearly';
        const commissionRate = isAnnual ? ANNUAL_COMMISSION_RATE : RECURRING_MONTHLY_COMMISSION_RATE;
        const commissionAmount = Math.round(netAmount * commissionRate);

        logPayload.gateway_fee = gatewayFee;
        logPayload.net_amount = netAmount;
        logPayload.commission_amount = commissionAmount;
        logPayload.commission_rate = commissionRate * 100;

        // Criar comissão pendente (será confirmada quando pagamento for processado)
        // A comissão só é criada após confirmação do pagamento no webhook
      }
    } else {
      logPayload.ineligibility_reason = 'Usuário não é indicado';
    }

    await supabaseAdmin.from('referral_audit_log').insert(logPayload);

    // Se não requer pagamento (crédito cobre tudo), atualizar plano imediatamente
    if (!requiresPayment) {
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: newPriceInfo.plan,
          billing_interval: newPriceInfo.interval === 'yearly' ? 'yearly' : 'monthly',
          subscription_cancel_at: null,
        })
        .eq('user_id', user.id);

      console.log("[upgrade-subscription-asaas] ✅ Profile updated (no payment required)");
    }

    const proratedAmountFormatted = (proratedAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    return new Response(
      JSON.stringify({
        success: true,
        proratedAmount: proratedAmount / 100,
        proratedAmountFormatted,
        creditAmount: creditAmount / 100,
        newPlan: newPriceInfo.plan,
        newInterval: newPriceInfo.interval,
        requiresPayment,
        paymentUrl,
        invoicePaid: !requiresPayment,
        gateway: 'asaas',
        message: requiresPayment 
          ? `Upgrade iniciado! Você será redirecionado para pagar o valor proporcional de ${proratedAmountFormatted}.`
          : `Upgrade realizado com sucesso para o plano ${newPriceInfo.plan === 'premium' ? 'Premium' : 'Profissional'}!`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[upgrade-subscription-asaas] ❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
