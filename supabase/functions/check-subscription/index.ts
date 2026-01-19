import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key found, returning basic subscription");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_tier: "basico",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Stripe key verified");

    // Use the service role key to perform writes (upsert) in Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_tier: "basico",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = "basico";
    let subscriptionEnd: string | null = null;
    let billingInterval: string | null = null;
    let subscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier from price ID
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      
      // Determine billing interval
      billingInterval = price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
      
      // ✅ Price IDs do Stripe TherapyPro (mais confiável que verificar valores)
      const PRO_PRICES = [
        'price_1SSMNgCP57sNVd3laEmlQOcb',  // pro mensal
        'price_1SSMOdCP57sNVd3la4kMOinN',  // pro anual
      ];
      const PREMIUM_PRICES = [
        'price_1SSMOBCP57sNVd3lqjfLY6Du',  // premium mensal
        'price_1SSMP7CP57sNVd3lSf4oYINX',  // premium anual
      ];
      
      if (PRO_PRICES.includes(priceId)) {
        subscriptionTier = "pro";
        logStep("Determined subscription tier from known price", { priceId, subscriptionTier, billingInterval });
      } else if (PREMIUM_PRICES.includes(priceId)) {
        subscriptionTier = "premium";
        logStep("Determined subscription tier from known price", { priceId, subscriptionTier, billingInterval });
      } else {
        // Fallback: usar valor para determinar (mensal apenas)
        const amount = price.unit_amount || 0;
        subscriptionTier = amount <= 2999 ? "pro" : "premium";
        logStep("Using fallback price detection", { priceId, amount, subscriptionTier, billingInterval });
      }

      // ✅ CRITICAL: Update the database with subscription info
      // This ensures the subscription is saved even if webhook fails
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: subscriptionTier,
          subscription_end_date: subscriptionEnd,
          billing_interval: billingInterval,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      } else {
        logStep("✅ Profile updated successfully with subscription info", { 
          subscriptionTier, 
          subscriptionEnd,
          billingInterval 
        });
      }
    } else {
      logStep("No active subscription found");
      
      // Check if user had a subscription but it expired
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_plan, stripe_customer_id')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.subscription_plan && profile.subscription_plan !== 'basico') {
        // User had a subscription but it's no longer active - reset to basic
        logStep("User had subscription but it's now inactive, resetting to basic");
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: 'basico',
            subscription_end_date: null,
            billing_interval: null,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }
    }

    logStep("Returning subscription info", { subscribed: hasActiveSub, subscriptionTier });
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      plan: subscriptionTier // Added for compatibility with get-subscription-status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
