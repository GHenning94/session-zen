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

    console.log("[cancel-subscription] Canceling for user:", user.id);

    // Get profile with subscription data
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, subscription_plan, nome")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (!profile.stripe_customer_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];

    // Cancel at period end (grace period)
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });

    console.log("[cancel-subscription] Subscription canceled at period end:", {
      id: canceledSubscription.id,
      cancel_at: canceledSubscription.cancel_at,
      current_period_end: canceledSubscription.current_period_end
    });

    // Update profile with cancel_at date
    const cancelAt = canceledSubscription.cancel_at 
      ? new Date(canceledSubscription.cancel_at * 1000).toISOString()
      : new Date(canceledSubscription.current_period_end * 1000).toISOString();

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ subscription_cancel_at: cancelAt })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[cancel-subscription] Error updating profile:", updateError);
    }

    // Create notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        titulo: "Assinatura Cancelada",
        conteudo: `Seu plano ${profile.subscription_plan} ficará ativo até ${new Date(cancelAt).toLocaleDateString('pt-BR')}. Após essa data, você retornará ao plano gratuito.`
      });

    // Send remarketing email
    try {
      const serviceRoleClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await serviceRoleClient.functions.invoke('send-downgrade-email', {
        body: {
          email: user.email,
          userName: profile.nome || 'Profissional',
          previousPlan: profile.subscription_plan,
          cancelAt: cancelAt
        }
      });
      console.log("[cancel-subscription] Remarketing email sent successfully");
    } catch (emailError) {
      console.error("[cancel-subscription] Failed to send remarketing email:", emailError);
      // Don't fail the cancellation if email fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Assinatura cancelada com sucesso",
      cancel_at: cancelAt,
      grace_period_end: cancelAt
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[cancel-subscription] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
