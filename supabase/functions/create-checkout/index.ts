// supabase/functions/create-checkout/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:8080";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[create-checkout] User not authenticated");
      throw new Error("User not authenticated.");
    }

    console.log("[create-checkout] User authenticated:", user.id);

    // Check if user email is confirmed
    if (!user.email_confirmed_at) {
      console.error("[create-checkout] User email not confirmed:", user.id);
      throw new Error("Email não confirmado. Por favor, confirme seu email antes de assinar.");
    }

    const { priceId, returnUrl } = await req.json();

    if (!priceId) {
      console.error("[create-checkout] Missing priceId");
      throw new Error("priceId is required.");
    }

    console.log("[create-checkout] Creating checkout for priceId:", priceId);
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Validate priceId exists in Stripe before creating session
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log("[create-checkout] Price validated:", price.id, "Product:", price.product);
    } catch (priceError) {
      console.error("[create-checkout] Invalid priceId:", priceId, priceError);
      throw new Error(`Price ID inválido: ${priceId}. Verifique a configuração do Stripe.`);
    }

    const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 });
    
    const customer = customers.length > 0 
      ? customers[0] 
      : await stripe.customers.create({ 
          email: user.email, 
          metadata: { user_id: user.id },
          name: user.user_metadata?.nome || user.email
        });

    console.log("[create-checkout] Customer:", customer.id);

    const origin = (typeof returnUrl === 'string' && returnUrl.length > 0) ? returnUrl : SITE_URL;

    // Determine plan name and billing interval from priceId
    let planName = "pro";
    let billingInterval = "monthly";
    
    // Map priceIds to plans
    const priceMap: Record<string, { plan: string; interval: string }> = {
      'price_1QqLiLBJC6TkeQebbJQiW8P0': { plan: 'pro', interval: 'monthly' },
      'price_1QqLjCBJC6TkeQebB0OjVdWp': { plan: 'pro', interval: 'yearly' },
      'price_1QqLkKBJC6TkeQebMaD5OlnU': { plan: 'premium', interval: 'monthly' },
      'price_1QqLlBBJC6TkeQebfWe0pPFy': { plan: 'premium', interval: 'yearly' }
    };

    const priceInfo = priceMap[priceId];
    if (priceInfo) {
      planName = priceInfo.plan;
      billingInterval = priceInfo.interval;
    } else {
      // Fallback to old logic
      if (priceId.includes("premium") || priceId === "price_1RoxpDFeTymAqTGEWg0sS49i") {
        planName = "premium";
      }
      if (priceId.toLowerCase().includes("annual") || priceId.toLowerCase().includes("yearly")) {
        billingInterval = "yearly";
      }
    }

    console.log("[create-checkout] Plan:", planName, "Interval:", billingInterval);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/welcome`,
      metadata: { 
        user_id: user.id,
        plan_name: planName,
        billing_interval: billingInterval
      },
      locale: 'pt-BR',
      custom_text: {
        submit: {
          message: 'Ao confirmar, você concorda com os Termos de Serviço do TherapyPro'
        }
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_name: planName,
          billing_interval: billingInterval
        }
      }
    });

    if (!session.url) {
      console.error("[create-checkout] No session URL generated");
      throw new Error("Failed to create Stripe session URL.");
    }

    console.log("[create-checkout] Session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-checkout] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Erro ao criar sessão de pagamento. Verifique os dados e tente novamente."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});