import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs do Stripe TherapyPro
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: 'price_1SSMNgCP57sNVd3laEmlQOcb',
    yearly: 'price_1SSMOdCP57sNVd3la4kMOinN'
  },
  premium: {
    monthly: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
    yearly: 'price_1SSMP7CP57sNVd3lSf4oYINX'
  }
};

/**
 * Cancel or Downgrade Subscription
 * 
 * CANCEL: Cancela a assinatura no fim do período (volta para básico)
 * DOWNGRADE: Agenda troca de plano no fim do período (ex: Premium → Pro)
 * 
 * Nenhuma ação é imediata - sempre respeita o período já pago (carência)
 */
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

    // Parse request body for action type
    let action = 'cancel';
    let targetPlan = 'basico';
    let targetInterval = 'monthly'; // Intervalo do plano de destino
    try {
      const body = await req.json();
      action = body.action || 'cancel';
      targetPlan = body.targetPlan || 'basico';
      targetInterval = body.targetInterval || 'monthly';
    } catch {
      // Default to cancel if no body provided
    }

    console.log(`[cancel-subscription] Action: ${action}, Target: ${targetPlan}/${targetInterval} for user:`, user.id);

    // Get profile with subscription data
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, subscription_plan, billing_interval, nome, professional_discount_used")
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
    const currentPeriodEnd = subscription.current_period_end;
    const cancelAt = new Date(currentPeriodEnd * 1000).toISOString();

    const isDowngrade = action === 'downgrade' && targetPlan !== 'basico';
    
    let resultMessage = '';

    if (isDowngrade) {
      // ===================================================
      // DOWNGRADE: Agendar troca de plano no fim do período
      // ===================================================
      console.log(`[cancel-subscription] Processing DOWNGRADE to ${targetPlan}/${targetInterval}`);
      
      const newPriceId = PRICE_IDS[targetPlan]?.[targetInterval];
      if (!newPriceId) {
        throw new Error(`Invalid target plan/interval: ${targetPlan}/${targetInterval}`);
      }

      // Verificar se usuário foi indicado e não usou o desconto
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: referralData } = await supabaseAdmin
        .from('referrals')
        .select('id')
        .eq('referred_user_id', user.id)
        .single();

      const isReferred = !!referralData;
      const canApplyDiscount = isReferred && 
                               !profile.professional_discount_used && 
                               targetPlan === 'pro';

      console.log(`[cancel-subscription] Downgrade discount check:`, {
        isReferred,
        professionalDiscountUsed: profile.professional_discount_used,
        targetPlan,
        canApplyDiscount
      });

      // Usar Subscription Schedule para agendar a mudança
      // Primeiro verificar se já existe um schedule
      let scheduleId: string | null = null;
      
      if (subscription.schedule) {
        // Já existe um schedule, precisamos atualizá-lo
        scheduleId = subscription.schedule as string;
        console.log(`[cancel-subscription] Updating existing schedule:`, scheduleId);
      } else {
        // Criar novo schedule a partir da assinatura atual
        const newSchedule = await stripe.subscriptionSchedules.create({
          from_subscription: subscription.id
        });
        scheduleId = newSchedule.id;
        console.log(`[cancel-subscription] Created new schedule:`, scheduleId);
      }

      // Configurar as fases do schedule
      const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [
        {
          // Fase atual: manter plano atual até o fim do período
          items: [{ price: subscription.items.data[0].price.id }],
          start_date: subscription.current_period_start,
          end_date: currentPeriodEnd,
          proration_behavior: 'none',
        },
        {
          // Fase futura: novo plano após o fim do período
          items: [{ price: newPriceId }],
          start_date: currentPeriodEnd,
          proration_behavior: 'none',
          metadata: {
            user_id: user.id,
            is_downgrade: 'true',
            apply_referral_discount: canApplyDiscount ? 'true' : 'false',
          }
        }
      ];

      // Se pode aplicar desconto, criar cupom para a próxima fase
      if (canApplyDiscount) {
        const coupon = await stripe.coupons.create({
          percent_off: 20,
          duration: 'once',
          name: 'Desconto de Indicação - 20% (Downgrade)',
          metadata: {
            type: 'referral_discount_downgrade',
            user_id: user.id,
          }
        });
        
        phases[1].coupon = coupon.id;
        console.log(`[cancel-subscription] Created discount coupon for downgrade:`, coupon.id);
      }

      // Atualizar o schedule
      await stripe.subscriptionSchedules.update(scheduleId, {
        end_behavior: 'release', // Continuar como assinatura normal após completar
        phases: phases,
      });

      console.log(`[cancel-subscription] Schedule updated for downgrade`);

      // Atualizar perfil com informação do downgrade agendado
      await supabaseClient
        .from("profiles")
        .update({ 
          subscription_cancel_at: cancelAt,
          // Adicionar metadados do downgrade planejado
        })
        .eq("user_id", user.id);

      const targetPlanName = targetPlan === 'pro' ? 'Profissional' : 'Premium';
      const discountMsg = canApplyDiscount ? ' com 20% de desconto de indicação!' : '.';
      resultMessage = `Downgrade agendado com sucesso! Você continuará no plano ${profile.subscription_plan === 'premium' ? 'Premium' : 'Profissional'} até ${new Date(cancelAt).toLocaleDateString('pt-BR')}. Após essa data, será automaticamente movido para o plano ${targetPlanName}${discountMsg}`;

    } else {
      // ===================================================
      // CANCEL: Cancelar assinatura no fim do período
      // ===================================================
      console.log(`[cancel-subscription] Processing CANCELLATION`);

      // Verificar se existe schedule e cancelar
      if (subscription.schedule) {
        await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
        console.log(`[cancel-subscription] Cancelled existing schedule`);
      }

      // Cancelar no fim do período
      const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true
      });

      console.log("[cancel-subscription] Subscription canceled at period end:", {
        id: canceledSubscription.id,
        cancel_at: canceledSubscription.cancel_at,
        current_period_end: canceledSubscription.current_period_end
      });

      // Atualizar perfil
      await supabaseClient
        .from("profiles")
        .update({ subscription_cancel_at: cancelAt })
        .eq("user_id", user.id);

      resultMessage = `Assinatura cancelada com sucesso! Você continuará com acesso ao plano ${profile.subscription_plan === 'premium' ? 'Premium' : 'Profissional'} até ${new Date(cancelAt).toLocaleDateString('pt-BR')}. Após essa data, você retornará ao plano gratuito.`;
    }

    // Criar notificação
    const notificationTitle = isDowngrade ? "Downgrade Agendado" : "Assinatura Cancelada";
    const targetPlanName = targetPlan === 'pro' ? 'Profissional' : targetPlan === 'premium' ? 'Premium' : 'Básico';
    const notificationContent = isDowngrade
      ? `Seu plano ${profile.subscription_plan} ficará ativo até ${new Date(cancelAt).toLocaleDateString('pt-BR')}. Após essa data, você será movido automaticamente para o plano ${targetPlanName}.`
      : `Seu plano ${profile.subscription_plan} ficará ativo até ${new Date(cancelAt).toLocaleDateString('pt-BR')}. Após essa data, você retornará ao plano gratuito.`;

    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        titulo: notificationTitle,
        conteudo: notificationContent
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
          targetPlan: isDowngrade ? targetPlan : 'basico',
          cancelAt: cancelAt,
          isDowngrade: isDowngrade
        }
      });
      console.log("[cancel-subscription] Remarketing email sent successfully");
    } catch (emailError) {
      console.error("[cancel-subscription] Failed to send remarketing email:", emailError);
      // Don't fail the cancellation if email fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: resultMessage,
      cancel_at: cancelAt,
      grace_period_end: cancelAt,
      action: action,
      targetPlan: targetPlan,
      isDowngrade: isDowngrade
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
