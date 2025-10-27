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
          // Get billing interval from subscription
          let billingInterval = 'month';
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';
            } catch (e) {
              console.error('Error fetching subscription interval:', e);
            }
          }

          // Update user's subscription plan and mark onboarding as complete
          const { error } = await supabase
            .from("profiles")
            .update({ 
              subscription_plan: planName,
              billing_interval: billingInterval,
              first_login_completed: true,
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
        
        if (customer && !customer.deleted) {
          // Get user_id from customer metadata (set during customer creation)
          const userId = customer.metadata?.user_id;
          
          if (userId) {
            // Determine plan based on subscription status and price
            let planName = "basico";
            let planDisplayName = "Básico";
            let amount = 0;
            
            if (subscription.status === "active" && subscription.items.data.length > 0) {
              const priceId = subscription.items.data[0].price.id;
              const price = await stripe.prices.retrieve(priceId);
              amount = price.unit_amount || 0;
              
              if (amount <= 2999) {
                planName = "pro";
                planDisplayName = "Pro";
              } else {
                planName = "premium";
                planDisplayName = "Premium";
              }
            }

            // Get billing interval
            const billingInterval = subscription.items.data[0]?.price.recurring?.interval || null;

            const { error } = await supabase
              .from("profiles")
              .update({ 
                subscription_plan: planName,
                billing_interval: billingInterval,
                updated_at: new Date().toISOString()
              })
              .eq("user_id", userId);

            if (error) {
              console.error("Error updating subscription:", error);
              throw error;
            }

            // Send renewal notification if this is an update (renewal)
            if (event.type === "customer.subscription.updated" && subscription.status === "active") {
              // Get user email
              const { data: profile } = await supabase
                .from("profiles")
                .select("nome")
                .eq("user_id", userId)
                .single();

              // Create notification
              await supabase
                .from("notifications")
                .insert({
                  user_id: userId,
                  titulo: "Assinatura renovada com sucesso!",
                  conteudo: `Sua assinatura do plano ${planDisplayName} foi renovada. Valor: R$ ${(amount / 100).toFixed(2)}. Obrigado por continuar conosco!`,
                  lida: false
                });

              console.log(`[WEBHOOK] Sent renewal notification to user ${userId}`);
            }

            console.log(`[WEBHOOK] Updated user ${userId} subscription to ${planName}`);
          } else {
            console.error("[WEBHOOK] No user_id found in customer metadata");
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