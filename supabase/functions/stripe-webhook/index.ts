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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("❌ Security: Missing signature or webhook secret");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[webhook] 📨 Processing event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        // MELHORADO: Buscar metadata do checkout E da subscription
        let userId = session.metadata?.user_id;
        let planName = session.metadata?.plan_name || 'pro';
        let billingInterval = session.metadata?.billing_interval || 'monthly';

        // Se não encontrar userId nos metadados da sessão, buscar do customer
        if (!userId) {
          console.log('[webhook] Buscando user_id pelo customer_id:', customerId)
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (profile) {
            userId = profile.user_id;
            console.log('[webhook] User_id encontrado no perfil:', userId)
          }
        }

        if (!userId) {
          console.error('[webhook] ❌ No user_id found in session or customer');
          break;
        }

        console.log('[webhook] 💳 Checkout completed:', {
          user: userId,
          plan: planName,
          interval: billingInterval,
          customer: customerId,
          subscription: subscriptionId
        });
        
        // Calcular data de próxima renovação
        const currentDate = new Date();
        const nextBillingDate = new Date(currentDate);
        
        if (billingInterval === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        // Atualizar perfil com informações completas da assinatura
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_plan: planName,
            billing_interval: billingInterval,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_end_date: nextBillingDate.toISOString(),
            subscription_cancel_at: null
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[webhook] ❌ Error updating profile:', updateError);
        } else {
          console.log('[webhook] ✅ Profile updated successfully to plan:', planName);
          
          // Criar notificação de boas-vindas
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              titulo: 'Bem-vindo ao TherapyPro!',
              conteudo: `Sua assinatura ${planName === 'premium' ? 'Premium' : 'Profissional'} foi ativada com sucesso. Aproveite todos os recursos!`
            });
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] 🆕 Subscription created:', {
          subscription: subscription.id,
          customer: customerId,
          status: subscription.status,
          metadata: subscription.metadata
        });

        // Buscar usuário pelo customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('[webhook] ❌ Profile not found for customer:', customerId);
          break;
        }

        // Determinar plano baseado no price ID
        const priceId = subscription.items.data[0]?.price.id;
        const priceToPlans: { [key: string]: string } = {
          'price_1SSMNgCP57sNVd3laEmlQOcb': 'pro',
          'price_1SSMOdCP57sNVd3la4kMOinN': 'pro',
          'price_1SSMOBCP57sNVd3lqjfLY6Du': 'premium',
          'price_1SSMP7CP57sNVd3lSf4oYINX': 'premium'
        };
        
        const planName = priceId && priceToPlans[priceId] ? priceToPlans[priceId] : 'pro';
        const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';

        // Atualizar profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: planName,
            billing_interval: billingInterval === 'year' ? 'yearly' : 'monthly',
            stripe_subscription_id: subscription.id,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error('[webhook] ❌ Error updating subscription:', updateError);
        } else {
          console.log('[webhook] ✅ Subscription created and profile updated:', planName);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        console.log('[webhook] 💰 Payment succeeded for invoice:', invoice.id);

        // Buscar usuário pelo stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_plan, billing_interval')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Calcular próxima data de cobrança
          const nextBillingDate = new Date(invoice.period_end * 1000);

          // Atualizar data de renovação
          await supabase
            .from('profiles')
            .update({
              subscription_end_date: nextBillingDate.toISOString(),
              subscription_cancel_at: null
            })
            .eq('user_id', profile.user_id);

          console.log('[webhook] ✅ Next billing date updated:', nextBillingDate.toISOString());

          // Notificar usuário
          await supabase
            .from('notifications')
            .insert({
              user_id: profile.user_id,
              titulo: 'Pagamento Confirmado',
              conteudo: `Seu pagamento de R$ ${(invoice.amount_paid / 100).toFixed(2)} foi processado com sucesso. Próxima cobrança: ${nextBillingDate.toLocaleDateString('pt-BR')}`
            });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] 🔄 Subscription updated:', {
          subscription: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          items: subscription.items.data.map(item => ({
            price: item.price.id,
            product: item.price.product
          }))
        });

        // Buscar usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_plan')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const isActive = subscription.status === 'active';
          
          // Buscar os metadados do preço para descobrir o plano
          const priceId = subscription.items.data[0]?.price.id;
          let newPlanName = profile.subscription_plan;
          
          // Mapear price IDs para planos
          const priceToPlans: { [key: string]: string } = {
            'price_1SSMNgCP57sNVd3laEmlQOcb': 'pro',  // Profissional Mensal
            'price_1SSMOdCP57sNVd3la4kMOinN': 'pro',  // Profissional Anual
            'price_1SSMOBCP57sNVd3lqjfLY6Du': 'premium', // Premium Mensal
            'price_1SSMP7CP57sNVd3lSf4oYINX': 'premium'  // Premium Anual
          };
          
          if (priceId && priceToPlans[priceId]) {
            newPlanName = priceToPlans[priceId];
          }
          
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';

          const updateData: any = {
            subscription_plan: isActive ? newPlanName : 'basico',
            billing_interval: isActive ? (billingInterval === 'year' ? 'yearly' : 'monthly') : null,
          };

          // ✅ PERÍODO DE CARÊNCIA: Se cancelado, manter acesso até o fim do período
          if (subscription.cancel_at_period_end || subscription.cancel_at) {
            updateData.subscription_cancel_at = subscription.cancel_at 
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : new Date(subscription.current_period_end * 1000).toISOString();
            
            console.log('[webhook] ⚠️ Subscription will cancel at:', updateData.subscription_cancel_at);
          } else {
            updateData.subscription_cancel_at = null;
          }

          console.log('[webhook] 📝 Updating profile with:', updateData);

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error('[webhook] ❌ Error updating subscription:', updateError);
          } else {
            console.log('[webhook] ✅ Subscription updated successfully - New plan:', newPlanName);

            // Notificar sobre cancelamento agendado
            if (subscription.cancel_at_period_end) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: profile.user_id,
                  titulo: 'Assinatura Cancelada',
                  conteudo: `Sua assinatura foi cancelada mas você terá acesso até ${new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')}`
                });
            } else if (isActive && newPlanName !== profile.subscription_plan) {
              // Notificar sobre mudança de plano
              await supabase
                .from('notifications')
                .insert({
                  user_id: profile.user_id,
                  titulo: 'Plano Atualizado',
                  conteudo: `Seu plano foi alterado para ${newPlanName === 'premium' ? 'Premium' : 'Profissional'} com sucesso!`
                });
            }
          }
        } else {
          console.error('[webhook] ❌ Profile not found for customer:', customerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] 🗑️ Subscription deleted:', subscription.id);

        // Buscar usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // ✅ Reverter para plano gratuito
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              subscription_plan: 'basico',
              billing_interval: null,
              subscription_cancel_at: null,
              subscription_end_date: null,
              stripe_subscription_id: null
            })
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error('[webhook] ❌ Error deleting subscription:', updateError);
          } else {
            console.log('[webhook] ✅ User reverted to basic plan');
            
            await supabase
              .from('notifications')
              .insert({
                user_id: profile.user_id,
                titulo: 'Assinatura Encerrada',
                conteudo: 'Sua assinatura foi encerrada. Você agora está no plano gratuito com funcionalidades limitadas.'
              });
          }
        }
        break;
      }

      default:
        console.log(`[webhook] ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[webhook] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});