import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Payment Gateway Router - TODOS usam Stripe
 * 
 * Este endpoint retorna informações sobre o gateway de pagamento
 * e status de indicação do usuário. Agora todos pagam via Stripe.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[check-payment-gateway] 🚀 Verificando gateway...');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[check-payment-gateway] ❌ User not authenticated");
      return new Response(JSON.stringify({ 
        gateway: 'stripe',
        isReferred: false,
        canApplyDiscount: false,
        reason: 'not_authenticated'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("[check-payment-gateway] ✅ User authenticated:", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar se usuário foi indicado
    const { data: referralData, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('id, status, first_payment_date, referrer_user_id, subscription_plan')
      .eq('referred_user_id', user.id)
      .single();

    if (referralError && referralError.code !== 'PGRST116') {
      console.error('[check-payment-gateway] ❌ Error checking referral:', referralError);
    }

    // Verificar se desconto já foi usado
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('professional_discount_used')
      .eq('user_id', user.id)
      .single();

    const isReferred = !!referralData;
    const hasUsedDiscount = profile?.professional_discount_used === true;
    const canApplyDiscount = isReferred && !hasUsedDiscount;

    console.log('[check-payment-gateway] 💳 Gateway check result:', {
      gateway: 'stripe',
      isReferred,
      hasUsedDiscount,
      canApplyDiscount
    });
    
    // TODOS usam Stripe
    return new Response(JSON.stringify({ 
      gateway: 'stripe',
      isReferred,
      referralId: referralData?.id || null,
      referrerId: referralData?.referrer_user_id || null,
      hasFirstPayment: !!referralData?.first_payment_date,
      canApplyDiscount,
      reason: isReferred ? 'referred_user' : 'not_referred'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[check-payment-gateway] ❌ Error:", error);
    return new Response(JSON.stringify({ 
      gateway: 'stripe',
      isReferred: false,
      canApplyDiscount: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
