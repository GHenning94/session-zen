import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://therapypro.app.br";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-checkout] 🚀 Iniciando criação de checkout...');
    
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

    const { priceId, returnUrl, referralCode } = await req.json();

    if (!priceId) {
      console.error("[create-checkout] ❌ Missing priceId");
      throw new Error("priceId é obrigatório.");
    }

    console.log("[create-checkout] 💳 Creating checkout for priceId:", priceId, "referralCode:", referralCode);
    
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

    // Build metadata including referral code if present
    const sessionMetadata: Record<string, string> = { 
      user_id: user.id,
      plan_name: priceInfo.plan,
      billing_interval: priceInfo.interval
    };
    
    if (referralCode) {
      sessionMetadata.referral_code = referralCode;
      console.log("[create-checkout] 🎯 Including referral code in metadata:", referralCode);
    }

    // Admin client para verificar se usuário foi indicado
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Verificar se usuário foi indicado (existe como referred_user_id na tabela referrals)
    let isReferredUser = false;
    let hasUsedCoupon = false;

    try {
      const { data: referralData } = await supabaseAdmin
        .from('referrals')
        .select('id, status, first_payment_date')
        .eq('referred_user_id', user.id)
        .single();
      
      if (referralData) {
        isReferredUser = true;
        hasUsedCoupon = !!referralData.first_payment_date;
        console.log('[create-checkout] 🎯 Usuário indicado:', { isReferredUser, hasUsedCoupon });
      }
    } catch (e) {
      console.log('[create-checkout] ℹ️ Usuário não é indicado ou erro ao verificar:', e);
    }

    // Determinar se habilita códigos promocionais:
    // - Usuário deve ser indicado
    // - Plano deve ser PRO (mensal ou anual)
    // - Usuário não pode ter usado o cupom antes
    const allowPromoCodes = isReferredUser && 
                            priceInfo.plan === 'pro' && 
                            !hasUsedCoupon;

    console.log('[create-checkout] 💳 Allow promo codes:', allowPromoCodes, { 
      isReferredUser, 
      plan: priceInfo.plan, 
      hasUsedCoupon 
    });

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
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
      },
      // Só habilitar códigos promocionais para usuários indicados em planos Pro
      ...(allowPromoCodes ? { allow_promotion_codes: true } : {}),
    });

    if (!session.url) {
      console.error("[create-checkout] ❌ No session URL generated");
      throw new Error("Falha ao criar URL de checkout do Stripe.");
    }

    console.log("[create-checkout] ✅ Session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
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
