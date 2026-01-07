import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

    console.log(`[reactivate-subscription] Reactivating subscription for user:`, user.id);

    // Get profile with subscription data
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, subscription_plan, nome, subscription_cancel_at")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (!profile.stripe_customer_id) {
      throw new Error("No subscription found to reactivate");
    }

    if (!profile.subscription_cancel_at) {
      throw new Error("Subscription is not scheduled for cancellation");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get subscriptions that are set to cancel at period end
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found to reactivate");
    }

    const subscription = subscriptions.data[0];

    if (!subscription.cancel_at_period_end) {
      throw new Error("Subscription is not scheduled for cancellation");
    }

    // Remove the cancellation - subscription will continue
    const reactivatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false
    });

    console.log("[reactivate-subscription] Subscription reactivated:", {
      id: reactivatedSubscription.id,
      cancel_at_period_end: reactivatedSubscription.cancel_at_period_end
    });

    // Clear cancel_at from profile
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ subscription_cancel_at: null })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[reactivate-subscription] Error updating profile:", updateError);
    }

    // Create notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        titulo: "Assinatura Reativada",
        conteudo: `Sua assinatura do plano ${profile.subscription_plan} foi reativada com sucesso! A cobrança continuará normalmente.`
      });

    return new Response(JSON.stringify({
      success: true,
      message: "Assinatura reativada com sucesso",
      next_billing_date: new Date(reactivatedSubscription.current_period_end * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[reactivate-subscription] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
