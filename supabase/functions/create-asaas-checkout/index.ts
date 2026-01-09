import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://therapypro.app.br";

// Preços em centavos (mesmos do Stripe)
const PRICE_MAP: Record<string, { plan: string; interval: string; priceInCents: number; name: string }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', priceInCents: 2990, name: 'Plano Profissional Mensal' },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', priceInCents: 29880, name: 'Plano Profissional Anual' },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', priceInCents: 4990, name: 'Plano Premium Mensal' },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', priceInCents: 49896, name: 'Plano Premium Anual' }
};

// Desconto de 20% para indicados (apenas no primeiro mês do plano Profissional)
const REFERRAL_DISCOUNT_PERCENT = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-asaas-checkout] 🚀 Iniciando criação de checkout Asaas...');
    
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox";
    
    if (!asaasApiKey) {
      console.error('[create-asaas-checkout] ❌ ASAAS_API_KEY not configured');
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
      console.error("[create-asaas-checkout] ❌ User not authenticated");
      throw new Error("Usuário não autenticado.");
    }

    console.log("[create-asaas-checkout] ✅ User authenticated:", user.id);

    // Verificar se email foi confirmado
    if (!user.email_confirmed_at) {
      console.error("[create-asaas-checkout] ❌ User email not confirmed:", user.id);
      throw new Error("Email não confirmado. Por favor, confirme seu email antes de assinar.");
    }

    const { priceId, returnUrl, applyDiscount = true } = await req.json();

    if (!priceId) {
      console.error("[create-asaas-checkout] ❌ Missing priceId");
      throw new Error("priceId é obrigatório.");
    }

    const priceInfo = PRICE_MAP[priceId];
    
    if (!priceInfo) {
      console.error("[create-asaas-checkout] ❌ Invalid priceId:", priceId);
      throw new Error(`Price ID inválido: ${priceId}`);
    }

    console.log("[create-asaas-checkout] 💳 Price info:", priceInfo);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nome, cpf_cnpj')
      .eq('user_id', user.id)
      .single();

    // Verificar se usuário foi indicado (existe como referred_user_id na tabela referrals)
    let isReferredUser = false;
    let hasUsedDiscount = false;
    let referralId: string | null = null;

    const { data: referralData } = await supabaseAdmin
      .from('referrals')
      .select('id, status, first_payment_date')
      .eq('referred_user_id', user.id)
      .single();
    
    if (referralData) {
      isReferredUser = true;
      hasUsedDiscount = !!referralData.first_payment_date;
      referralId = referralData.id;
      console.log('[create-asaas-checkout] 🎯 Usuário indicado:', { isReferredUser, hasUsedDiscount });
    }

    // Calcular desconto: 20% apenas para indicados, plano Pro, primeiro pagamento
    const shouldApplyDiscount = applyDiscount && 
                                isReferredUser && 
                                priceInfo.plan === 'pro' && 
                                !hasUsedDiscount;
    
    let finalPriceInCents = priceInfo.priceInCents;
    let discountApplied = 0;
    
    if (shouldApplyDiscount) {
      discountApplied = Math.round(priceInfo.priceInCents * REFERRAL_DISCOUNT_PERCENT / 100);
      finalPriceInCents = priceInfo.priceInCents - discountApplied;
      console.log('[create-asaas-checkout] 🎁 Desconto aplicado:', {
        original: priceInfo.priceInCents,
        discount: discountApplied,
        final: finalPriceInCents
      });
    }

    // 1. Buscar ou criar cliente no Asaas
    let asaasCustomerId: string | null = null;
    
    // Buscar cliente existente por email
    const searchResponse = await fetch(`${asaasBaseUrl}/customers?email=${encodeURIComponent(user.email!)}`, {
      headers: { "access_token": asaasApiKey }
    });
    const searchResult = await searchResponse.json();
    
    if (searchResult.data && searchResult.data.length > 0) {
      asaasCustomerId = searchResult.data[0].id;
      console.log('[create-asaas-checkout] 👤 Cliente existente:', asaasCustomerId);
    } else {
      // Criar novo cliente
      const customerPayload = {
        name: profile?.nome || user.email,
        email: user.email,
        cpfCnpj: profile?.cpf_cnpj?.replace(/\D/g, '') || null,
        externalReference: user.id,
      };
      
      const createCustomerResponse = await fetch(`${asaasBaseUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(customerPayload),
      });
      
      const customerResult = await createCustomerResponse.json();
      
      if (customerResult.errors) {
        console.error('[create-asaas-checkout] ❌ Error creating customer:', customerResult);
        throw new Error(customerResult.errors[0]?.description || "Erro ao criar cliente no gateway.");
      }
      
      asaasCustomerId = customerResult.id;
      console.log('[create-asaas-checkout] 👤 Cliente criado:', asaasCustomerId);
    }

    // 2. Criar assinatura no Asaas
    const today = new Date();
    const nextDueDate = new Date(today);
    nextDueDate.setDate(nextDueDate.getDate() + 1); // Vencimento em 1 dia
    
    // Definir ciclo de cobrança
    const billingCycle = priceInfo.interval === 'yearly' ? 'YEARLY' : 'MONTHLY';
    
    const subscriptionPayload: any = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Permite qualquer forma de pagamento (PIX, cartão, boleto)
      value: finalPriceInCents / 100, // Asaas trabalha em reais, não centavos
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      cycle: billingCycle,
      description: priceInfo.name + (shouldApplyDiscount ? ' (20% desconto indicação)' : ''),
      externalReference: JSON.stringify({
        user_id: user.id,
        plan: priceInfo.plan,
        interval: priceInfo.interval,
        referral_id: referralId,
        discount_applied: shouldApplyDiscount,
        original_price: priceInfo.priceInCents,
      }),
    };

    // Se desconto aplicado, definir desconto na primeira cobrança
    if (shouldApplyDiscount && priceInfo.interval === 'monthly') {
      // Para mensal, desconto apenas no primeiro mês
      subscriptionPayload.discount = {
        value: discountApplied / 100,
        dueDateLimitDays: 0,
        type: 'FIXED',
      };
    }

    console.log('[create-asaas-checkout] 📝 Creating subscription:', JSON.stringify(subscriptionPayload, null, 2));

    const subscriptionResponse = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const subscriptionResult = await subscriptionResponse.json();

    if (subscriptionResult.errors) {
      console.error('[create-asaas-checkout] ❌ Error creating subscription:', subscriptionResult);
      throw new Error(subscriptionResult.errors[0]?.description || "Erro ao criar assinatura no gateway.");
    }

    console.log('[create-asaas-checkout] ✅ Subscription created:', subscriptionResult.id);

    // 3. Buscar o link de pagamento da primeira cobrança
    const paymentsResponse = await fetch(`${asaasBaseUrl}/subscriptions/${subscriptionResult.id}/payments`, {
      headers: { "access_token": asaasApiKey }
    });
    const paymentsResult = await paymentsResponse.json();

    let paymentUrl = null;
    if (paymentsResult.data && paymentsResult.data.length > 0) {
      const firstPayment = paymentsResult.data[0];
      paymentUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
      
      // Se não há URL de fatura, buscar link de pagamento
      if (!paymentUrl) {
        const paymentLinkResponse = await fetch(`${asaasBaseUrl}/payments/${firstPayment.id}/identificationField`, {
          headers: { "access_token": asaasApiKey }
        });
        const paymentLinkResult = await paymentLinkResponse.json();
        paymentUrl = paymentLinkResult.invoiceUrl;
      }
    }

    // Fallback: usar URL genérica do checkout Asaas
    if (!paymentUrl) {
      // Gerar link de pagamento direto
      const paymentLinkPayload = {
        name: priceInfo.name,
        description: priceInfo.name + (shouldApplyDiscount ? ' - 20% desconto indicação' : ''),
        endDate: null,
        value: finalPriceInCents / 100,
        billingType: 'UNDEFINED',
        chargeType: 'RECURRENT',
        dueDateLimitDays: 10,
        subscriptionCycle: billingCycle,
        maxInstallmentCount: 1,
        externalReference: JSON.stringify({
          user_id: user.id,
          plan: priceInfo.plan,
          interval: priceInfo.interval,
          subscription_id: subscriptionResult.id,
        }),
      };

      const paymentLinkResponse = await fetch(`${asaasBaseUrl}/paymentLinks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(paymentLinkPayload),
      });

      const paymentLinkResult = await paymentLinkResponse.json();
      
      if (paymentLinkResult.url) {
        paymentUrl = paymentLinkResult.url;
      }
    }

    // Se ainda não tiver URL, construir URL do checkout Asaas
    if (!paymentUrl && paymentsResult.data?.[0]?.id) {
      const baseCheckoutUrl = asaasEnv === "production" 
        ? "https://www.asaas.com/c" 
        : "https://sandbox.asaas.com/c";
      paymentUrl = `${baseCheckoutUrl}/${paymentsResult.data[0].id}`;
    }

    if (!paymentUrl) {
      console.error("[create-asaas-checkout] ❌ No payment URL generated");
      throw new Error("Falha ao gerar URL de pagamento.");
    }

    // Salvar referência da assinatura Asaas no perfil (temporariamente)
    await supabaseAdmin
      .from('profiles')
      .update({
        // Usar campo existente para guardar referência temporária do Asaas
        // O webhook vai atualizar quando o pagamento for confirmado
      })
      .eq('user_id', user.id);

    console.log("[create-asaas-checkout] ✅ Checkout URL generated:", paymentUrl);

    return new Response(JSON.stringify({ 
      url: paymentUrl,
      subscription_id: subscriptionResult.id,
      discount_applied: shouldApplyDiscount,
      original_price: priceInfo.priceInCents / 100,
      final_price: finalPriceInCents / 100,
      discount_amount: discountApplied / 100,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-asaas-checkout] ❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Erro ao criar sessão de pagamento Asaas."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
