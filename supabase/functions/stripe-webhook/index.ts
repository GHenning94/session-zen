import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  // Security: Only allow POST requests for webhooks
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Security: Missing signature or webhook secret");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planName = session.metadata?.plan_name;

        if (userId && planName) {
          // Update user's subscription plan
          const { error } = await supabase
            .from("profiles")
            .update({ 
              subscription_plan: planName,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);

          if (error) {
            console.error("Error updating user plan:", error);
            throw error;
          }

          // Create welcome notification
          await supabase
            .from("notifications")
            .insert({
              user_id: userId,
              titulo: "Plano ativado com sucesso!",
              conteudo: `Seu plano ${planName} foi ativado. Agora você tem acesso a todas as funcionalidades premium.`,
              lida: false
            });

          console.log(`Updated user ${userId} to plan ${planName}`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        // Security: Validate customer email format
        if (customer && !customer.deleted && customer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
          const isActive = subscription.status === "active";
          const planName = isActive ? "pro" : "basico"; // Downgrade para básico se cancelar

          // Find user by email and update plan
          const { data: profile, error: findError } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("email", customer.email)
            .single();

          if (!findError && profile) {
            const { error } = await supabase
              .from("profiles")
              .update({ 
                subscription_plan: planName,
                updated_at: new Date().toISOString()
              })
              .eq("user_id", profile.user_id);

            if (error) {
              console.error("Error updating subscription:", error);
              throw error;
            }

            console.log(`Updated subscription for ${customer.email} to ${planName}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});