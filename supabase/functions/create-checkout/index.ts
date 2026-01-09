import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://therapypro.app.br";

// Desconto de 20% para indicados na primeira cobrança do plano Profissional
const REFERRAL_DISCOUNT_PERCENT = 20;

/**
 * Stripe Checkout - TODOS os usuários pagam via Stripe
 * Usuários indicados recebem 20% de desconto na PRIMEIRA COBRANÇA do plano Profissional
 * (mensal OU anual) - direito único que persiste mesmo após passar por outros planos
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-checkout] 🚀 Iniciando criação de checkout Stripe...');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[create-checkout] ❌ User not authenticated");
      throw new Error("Usuário não autenticado.");
    }

    console.log("[create-checkout] ✅ User authenticated:", user.id);

    // Verificar se email foi confirmado
    if (!user.email_confirmed_at) {
      console.error("[create-checkout] ❌ User email not confirmed:", user.id);
      throw new Error("Email não confirmado. Por favor, confirme seu email antes de assinar.");
    }

    const { priceId, returnUrl } = await req.json();

    if (!priceId) {
      console.error("[create-checkout] ❌ Missing priceId");
      throw new Error("priceId é obrigatório.");
    }

    console.log("[create-checkout] 💳 Creating Stripe checkout for priceId:", priceId);
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // ✅ Price IDs corretos do Stripe TherapyPro
    const priceMap: Record<string, { plan: string; interval: string; price: number }> = {
      'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 29.90 },
      'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 298.80 },
      'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 49.90 },
      'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 498.96 }
    };

    const priceInfo = priceMap[priceId];
    
    if (!priceInfo) {
      console.error("[create-checkout] ❌ Invalid priceId:", priceId);
      throw new Error(`Price ID inválido: ${priceId}. Entre em contato com o suporte.`);
    }

    console.log("[create-checkout] 📊 Plan info:", priceInfo);

    // Admin client para verificar indicação
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('professional_discount_used')
      .eq('user_id', user.id)
      .single();

    // Verificar se usuário foi indicado
    const { data: referralData } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_user_id, first_payment_date')
      .eq('referred_user_id', user.id)
      .single();

    const isReferredUser = !!referralData;
    const hasUsedDiscount = profile?.professional_discount_used === true;
    const isProfessionalPlan = priceInfo.plan === 'pro';

    // Desconto: 20% para indicados na PRIMEIRA cobrança do plano Pro (mensal ou anual)
    // Este desconto persiste mesmo se o usuário passar por Premium antes
    const shouldApplyDiscount = isReferredUser && 
                                isProfessionalPlan && 
                                !hasUsedDiscount;

    console.log('[create-checkout] 🎯 Discount check:', {
      isReferredUser,
      hasUsedDiscount,
      isProfessionalPlan,
      interval: priceInfo.interval,
      shouldApplyDiscount
    });

    // Buscar ou criar cliente Stripe
    const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 });
    
    const customer = customers.length > 0 
      ? customers[0] 
      : await stripe.customers.create({ 
          email: user.email, 
          metadata: { user_id: user.id },
          name: user.user_metadata?.nome || user.email
        });

    console.log("[create-checkout] 👤 Customer:", customer.id);

    const origin = (typeof returnUrl === 'string' && returnUrl.length > 0) ? returnUrl : SITE_URL;

    // Build metadata
    const sessionMetadata: Record<string, string> = { 
      user_id: user.id,
      plan_name: priceInfo.plan,
      billing_interval: priceInfo.interval,
      is_referred: isReferredUser ? 'true' : 'false',
      referral_id: referralData?.id || '',
      referrer_user_id: referralData?.referrer_user_id || '',
      discount_applied: shouldApplyDiscount ? 'true' : 'false',
    };

    // Configurar checkout session
    const checkoutConfig: any = {
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      metadata: sessionMetadata,
      locale: 'pt-BR',
      custom_text: {
        submit: {
          message: 'Ao confirmar, você concorda com os Termos de Serviço do TherapyPro'
        }
      },
      subscription_data: {
        metadata: sessionMetadata
      }
    };

    // Aplicar desconto de 20% na primeira cobrança do plano Profissional se elegível
    // Aplica tanto para mensal quanto anual
    if (shouldApplyDiscount) {
      // Criar coupon para desconto único (aplicável mensal ou anual)
      // IMPORTANTE: O nome do cupom deve ter no máximo 40 caracteres
      const discountName = priceInfo.interval === 'monthly' 
        ? 'Indicacao 20% - 1o mes'        // 23 caracteres
        : 'Indicacao 20% - 1a anuidade';  // 29 caracteres
        
      const coupon = await stripe.coupons.create({
        percent_off: REFERRAL_DISCOUNT_PERCENT,
        duration: 'once', // Apenas uma vez (primeira cobrança)
        name: discountName,
        metadata: {
          type: 'referral_discount',
          referred_user_id: user.id,
          plan_interval: priceInfo.interval,
        }
      });

      checkoutConfig.discounts = [{ coupon: coupon.id }];
      console.log('[create-checkout] 🎁 Desconto 20% aplicado:', coupon.id, 'Interval:', priceInfo.interval);
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create(checkoutConfig);

    if (!session.url) {
      console.error("[create-checkout] ❌ No session URL generated");
      throw new Error("Falha ao criar URL de checkout do Stripe.");
    }

    console.log("[create-checkout] ✅ Session created successfully:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      discount_applied: shouldApplyDiscount, // Desconto aplica tanto mensal quanto anual
      is_referred: isReferredUser
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-checkout] ❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stripeError = (error as any)?.raw?.message;
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stripe_error: stripeError,
      details: stripeError || "Erro ao criar sessão de pagamento. Verifique os dados e tente novamente."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
