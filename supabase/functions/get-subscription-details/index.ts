import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GET-SUBSCRIPTION] Fetching details for user ${user.id}`);

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_plan, billing_interval")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("[GET-SUBSCRIPTION] Profile error:", profileError);
      throw profileError;
    }

    // Get user email from auth
    const userEmail = user.email;

    // Try to find Stripe customer by email
    let stripeCustomer = null;
    let activeSubscription = null;

    if (userEmail) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];

        // Get active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          activeSubscription = subscriptions.data[0];
        }
      }
    }

    // Build response
    const response = {
      plan: profile?.subscription_plan || "basico",
      billing_interval: activeSubscription?.items.data[0]?.price.recurring?.interval || profile?.billing_interval || null,
      status: activeSubscription ? activeSubscription.status : "inactive",
      current_period_end: activeSubscription ? new Date(activeSubscription.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: activeSubscription?.cancel_at_period_end || false,
      stripe_customer_id: stripeCustomer?.id || null,
      has_payment_method: stripeCustomer ? (stripeCustomer.invoice_settings?.default_payment_method ? true : false) : false,
    };

    console.log("[GET-SUBSCRIPTION] Response:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[GET-SUBSCRIPTION] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error",
        plan: "basico",
        billing_interval: null,
        status: "error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
