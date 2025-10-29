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
        const planName = session.metadata?.plan_name || 'pro';
        const billingInterval = session.metadata?.billing_interval || 'monthly';

        if (userId) {
          console.log('[webhook] Processing checkout.session.completed for user:', userId, {
            plan: planName,
            interval: billingInterval,
            customer: session.customer
          });
          
          // Update user profile with complete subscription info
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              subscription_plan: planName,
              billing_interval: billingInterval,
              stripe_customer_id: session.customer as string,
              subscription_start_date: new Date().toISOString(),
              onboarding_completed: true,
              first_login_completed: true
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[webhook] Error updating profile:', updateError);
          } else {
            console.log('[webhook] Profile updated successfully with subscription data');
            
            // Create welcome notification
            await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                titulo: 'Bem-vindo ao TherapyPro!',
                conteudo: `Sua assinatura ${planName === 'premium' ? 'Premium' : 'Profissional'} foi ativada com sucesso. Aproveite todos os recursos!`
              });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log('[webhook] Processing subscription.updated for user:', userId, {
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at
          });
          
          const newPlanName = subscription.items.data[0]?.price.metadata?.plan_name || 
                             subscription.metadata?.plan_name || 'pro';
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 
                                  subscription.metadata?.billing_interval || 'month';
          const isActive = subscription.status === 'active';

          const updateData: any = {
            subscription_plan: isActive ? newPlanName : 'basico',
            billing_interval: isActive ? (billingInterval === 'year' ? 'yearly' : 'monthly') : null
          };

          // Handle cancellation
          if (subscription.cancel_at_period_end || subscription.cancel_at) {
            updateData.subscription_cancel_at = subscription.cancel_at 
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : new Date(subscription.current_period_end * 1000).toISOString();
          } else {
            updateData.subscription_cancel_at = null;
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', userId);

          if (updateError) {
            console.error('[webhook] Error updating subscription:', updateError);
          } else {
            console.log('[webhook] Subscription updated successfully');
          }

          // Send renewal notification if subscription is being renewed
          if (isActive && !subscription.cancel_at_period_end) {
            await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                titulo: 'Assinatura Renovada',
                conteudo: `Sua assinatura ${newPlanName} foi renovada com sucesso!`
              });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
          console.log('[webhook] Processing subscription.deleted for user:', userId);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              subscription_plan: 'basico',
              billing_interval: null,
              subscription_cancel_at: null,
              stripe_customer_id: null
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[webhook] Error deleting subscription:', updateError);
          } else {
            console.log('[webhook] Subscription deleted, user reverted to basic plan');
            
            // Send notification
            await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                titulo: 'Assinatura Encerrada',
                conteudo: 'Sua assinatura foi encerrada. Você agora está no plano gratuito.'
              });
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