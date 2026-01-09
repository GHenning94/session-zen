import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// Taxas de comissão do programa de indicação
const FIRST_MONTH_COMMISSION_RATE = 0.30; // 30% primeiro mês mensal
const RECURRING_MONTHLY_COMMISSION_RATE = 0.15; // 15% meses seguintes mensal
const ANNUAL_COMMISSION_RATE = 0.20; // 20% anual

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    console.log(`[asaas-webhook] 📨 Processing event: ${event}`);
    console.log(`[asaas-webhook] 📦 Payment data:`, JSON.stringify(payment, null, 2));

    // Processar diferentes eventos do Asaas
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        await handlePaymentConfirmed(payment);
        break;
      }

      case 'PAYMENT_OVERDUE': {
        await handlePaymentOverdue(payment);
        break;
      }

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_REFUND_IN_PROGRESS': {
        await handlePaymentRefunded(payment);
        break;
      }

      case 'PAYMENT_DELETED':
      case 'PAYMENT_ANTICIPATED_CANCELED': {
        await handlePaymentCancelled(payment);
        break;
      }

      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED': {
        await handleSubscriptionCancelled(payment);
        break;
      }

      default:
        console.log(`[asaas-webhook] ℹ️ Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[asaas-webhook] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function handlePaymentConfirmed(payment: any) {
  console.log('[asaas-webhook] 💰 Processing payment confirmation');

  // Extrair dados do externalReference
  let metadata: any = {};
  try {
    if (payment.externalReference) {
      metadata = JSON.parse(payment.externalReference);
    }
  } catch (e) {
    console.log('[asaas-webhook] ⚠️ Could not parse externalReference');
  }

  const userId = metadata.user_id;
  const planName = metadata.plan || 'pro';
  const billingInterval = metadata.interval || 'monthly';
  const referralId = metadata.referral_id;
  const discountApplied = metadata.discount_applied || false;
  const originalPrice = metadata.original_price;

  if (!userId) {
    // Tentar buscar pelo customer
    if (payment.customer) {
      const { data: customerData } = await fetchAsaasCustomer(payment.customer);
      if (customerData?.externalReference) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', customerData.externalReference)
          .single();
        
        if (profile) {
          await processPaymentForUser(profile.user_id, planName, billingInterval, payment, referralId, discountApplied, originalPrice);
        }
      } else if (customerData?.email) {
        // Buscar por email no auth
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(customerData.email);
        if (authUser) {
          await processPaymentForUser(authUser.id, planName, billingInterval, payment, referralId, discountApplied, originalPrice);
        }
      }
    }
    return;
  }

  await processPaymentForUser(userId, planName, billingInterval, payment, referralId, discountApplied, originalPrice);
}

async function processPaymentForUser(
  userId: string, 
  planName: string, 
  billingInterval: string, 
  payment: any,
  referralId?: string,
  discountApplied?: boolean,
  originalPrice?: number
) {
  console.log('[asaas-webhook] 👤 Processing payment for user:', userId);

  // Calcular data de próxima renovação
  const currentDate = new Date();
  const nextBillingDate = new Date(currentDate);
  
  if (billingInterval === 'yearly' || billingInterval === 'year') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  // Atualizar perfil
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      subscription_plan: planName,
      billing_interval: billingInterval === 'yearly' ? 'yearly' : 'monthly',
      subscription_end_date: nextBillingDate.toISOString(),
      subscription_cancel_at: null
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[asaas-webhook] ❌ Error updating profile:', updateError);
    return;
  }

  console.log('[asaas-webhook] ✅ Profile updated to plan:', planName);

  // Criar notificação de boas-vindas
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      titulo: 'Bem-vindo ao TherapyPro!',
      conteudo: `Sua assinatura ${planName === 'premium' ? 'Premium' : 'Profissional'} foi ativada com sucesso via Asaas. Aproveite todos os recursos!`
    });

  // Processar comissão de indicação se houver
  const amountInCents = Math.round((payment.value || 0) * 100);
  
  // Verificar se este é o primeiro pagamento (verificar se existe referral pendente)
  const { data: referralData } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .single();

  if (referralData) {
    const isFirstPayment = !referralData.first_payment_date;
    const isAnnual = billingInterval === 'yearly' || billingInterval === 'year';
    
    // Calcular valor base para comissão (usar valor original se houve desconto)
    const baseAmountForCommission = discountApplied && originalPrice ? originalPrice : amountInCents;
    
    if (isFirstPayment) {
      // Primeiro pagamento - 30% mensal ou 20% anual
      const commissionRate = isAnnual ? ANNUAL_COMMISSION_RATE : FIRST_MONTH_COMMISSION_RATE;
      const commissionAmount = Math.round(baseAmountForCommission * commissionRate);

      // Atualizar referral para converted
      await supabase
        .from('referrals')
        .update({
          status: 'converted',
          subscription_plan: planName,
          subscription_amount: baseAmountForCommission,
          commission_rate: commissionRate * 100,
          commission_amount: commissionAmount,
          first_payment_date: new Date().toISOString(),
        })
        .eq('id', referralData.id);

      // Buscar nome do indicado
      const { data: referredProfile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('user_id', userId)
        .single();

      // Criar payout pendente
      await supabase
        .from('referral_payouts')
        .insert({
          referrer_user_id: referralData.referrer_user_id,
          referral_id: referralData.id,
          amount: commissionAmount,
          currency: 'brl',
          status: 'pending',
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          referred_user_name: referredProfile?.nome || 'Novo usuário',
          referred_plan: planName,
        });

      // Notificar referrer
      const commissionDisplay = isAnnual ? '20%' : '30%';
      await supabase
        .from('notifications')
        .insert({
          user_id: referralData.referrer_user_id,
          titulo: 'Indicação convertida em assinatura! 💰',
          conteudo: `${referredProfile?.nome || 'Um usuário indicado'} assinou o plano ${planName === 'premium' ? 'Premium' : 'Profissional'} através da sua indicação! Você ganhou R$ ${(commissionAmount / 100).toFixed(2).replace('.', ',')} (${commissionDisplay}) de comissão.`,
        });

      console.log('[asaas-webhook] ✅ First payment referral processed, commission:', commissionAmount);
    } else if (referralData.status === 'converted') {
      // Pagamento recorrente - 15% mensal ou 20% anual
      const commissionRate = isAnnual ? ANNUAL_COMMISSION_RATE : RECURRING_MONTHLY_COMMISSION_RATE;
      const commissionAmount = Math.round(amountInCents * commissionRate);

      // Buscar nome do indicado
      const { data: referredProfile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('user_id', userId)
        .single();

      // Criar payout pendente
      await supabase
        .from('referral_payouts')
        .insert({
          referrer_user_id: referralData.referrer_user_id,
          referral_id: referralData.id,
          amount: commissionAmount,
          currency: 'brl',
          status: 'pending',
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          referred_user_name: referredProfile?.nome || 'Usuário',
          referred_plan: planName,
        });

      // Notificar referrer
      const rateDisplay = isAnnual ? '20%' : '15%';
      await supabase
        .from('notifications')
        .insert({
          user_id: referralData.referrer_user_id,
          titulo: 'Comissão Recorrente! 💰',
          conteudo: `${referredProfile?.nome || 'Seu indicado'} renovou a assinatura. Você receberá R$ ${(commissionAmount / 100).toFixed(2)} (${rateDisplay}) de comissão.`,
        });

      console.log('[asaas-webhook] ✅ Recurring commission created:', commissionAmount);
    }
  }
}

async function handlePaymentOverdue(payment: any) {
  console.log('[asaas-webhook] ⚠️ Payment overdue');
  
  let metadata: any = {};
  try {
    if (payment.externalReference) {
      metadata = JSON.parse(payment.externalReference);
    }
  } catch (e) {}

  const userId = metadata.user_id;
  if (!userId) return;

  // Notificar usuário sobre pagamento atrasado
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      titulo: 'Pagamento Pendente',
      conteudo: 'Seu pagamento está em atraso. Por favor, regularize para manter seu acesso aos recursos premium.',
    });
}

async function handlePaymentRefunded(payment: any) {
  console.log('[asaas-webhook] 💸 Payment refunded');
  
  let metadata: any = {};
  try {
    if (payment.externalReference) {
      metadata = JSON.parse(payment.externalReference);
    }
  } catch (e) {}

  const userId = metadata.user_id;
  if (!userId) return;

  // Cancelar comissões pendentes relacionadas a este pagamento
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_user_id')
    .eq('referred_user_id', userId)
    .single();

  if (referral) {
    // Cancelar payouts pendentes
    await supabase
      .from('referral_payouts')
      .update({ 
        status: 'cancelled',
        failure_reason: 'Pagamento reembolsado'
      })
      .eq('referral_id', referral.id)
      .eq('status', 'pending');

    // Notificar referrer
    await supabase
      .from('notifications')
      .insert({
        user_id: referral.referrer_user_id,
        titulo: 'Comissão Cancelada',
        conteudo: 'Uma comissão foi cancelada devido ao reembolso do pagamento do indicado.',
      });
  }

  // Notificar usuário
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      titulo: 'Reembolso Processado',
      conteudo: 'Seu pagamento foi reembolsado. Sua assinatura foi cancelada.',
    });

  // Reverter para plano básico
  await supabase
    .from('profiles')
    .update({ 
      subscription_plan: 'basico',
      billing_interval: null,
      subscription_cancel_at: null,
      subscription_end_date: null,
    })
    .eq('user_id', userId);
}

async function handlePaymentCancelled(payment: any) {
  console.log('[asaas-webhook] ❌ Payment cancelled');
  // Similar ao refund
  await handlePaymentRefunded(payment);
}

async function handleSubscriptionCancelled(payment: any) {
  console.log('[asaas-webhook] 🗑️ Subscription cancelled');
  
  let metadata: any = {};
  try {
    if (payment.externalReference) {
      metadata = JSON.parse(payment.externalReference);
    }
  } catch (e) {}

  const userId = metadata.user_id;
  if (!userId) return;

  // Atualizar status do referral
  await supabase
    .from('referrals')
    .update({ status: 'cancelled' })
    .eq('referred_user_id', userId);

  // Reverter para plano básico
  await supabase
    .from('profiles')
    .update({ 
      subscription_plan: 'basico',
      billing_interval: null,
      subscription_cancel_at: null,
      subscription_end_date: null,
    })
    .eq('user_id', userId);

  // Notificar
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      titulo: 'Assinatura Encerrada',
      conteudo: 'Sua assinatura foi encerrada. Você agora está no plano gratuito com funcionalidades limitadas.',
    });
}

async function fetchAsaasCustomer(customerId: string) {
  const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
  const asaasEnv = Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox";
  const asaasBaseUrl = asaasEnv === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

  try {
    const response = await fetch(`${asaasBaseUrl}/customers/${customerId}`, {
      headers: { "access_token": asaasApiKey! }
    });
    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}
