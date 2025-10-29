import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    
    if (!user) throw new Error("User not authenticated.");

    console.log("[get-subscription-status] Fetching for user:", user.id);

    // Get profile with subscription data
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_plan, billing_interval, stripe_customer_id, subscription_start_date, subscription_cancel_at")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("[get-subscription-status] Profile error:", profileError);
      throw profileError;
    }

    console.log("[get-subscription-status] Profile data:", profile);

    // If no paid plan, return basic info
    if (!profile.subscription_plan || profile.subscription_plan === "basico") {
      return new Response(JSON.stringify({
        plan: "basico",
        status: "active",
        billing_interval: null,
        start_date: null,
        next_billing_date: null,
        cancel_at: null,
        is_canceled: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If has Stripe customer ID, get subscription details from Stripe
    if (profile.stripe_customer_id) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2023-10-16",
      });

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "all",
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          
          console.log("[get-subscription-status] Stripe subscription:", {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at
          });

          return new Response(JSON.stringify({
            plan: profile.subscription_plan,
            status: subscription.status,
            billing_interval: profile.billing_interval,
            start_date: profile.subscription_start_date || new Date(subscription.created * 1000).toISOString(),
            next_billing_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : (profile.subscription_cancel_at || null),
            is_canceled: subscription.cancel_at_period_end || false,
            subscription_id: subscription.id
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } catch (stripeError) {
        console.error("[get-subscription-status] Stripe error:", stripeError);
        // Continue with profile data even if Stripe fails
      }
    }

    // Fallback to profile data only
    return new Response(JSON.stringify({
      plan: profile.subscription_plan,
      status: "active",
      billing_interval: profile.billing_interval,
      start_date: profile.subscription_start_date,
      next_billing_date: null,
      cancel_at: profile.subscription_cancel_at,
      is_canceled: !!profile.subscription_cancel_at
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[get-subscription-status] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
