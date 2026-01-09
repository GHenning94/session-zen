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

// Taxa do gateway Asaas (aproximada para cálculo de comissão líquida)
const ASAAS_FEE_RATE = 0.0299; // 2.99%
const ASAAS_FIXED_FEE = 49; // R$0.49 em centavos

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Helper para log de auditoria de indicação
async function logReferralAction(data: {
  action: string;
  referrer_user_id?: string;
  referred_user_id?: string;
  referral_id?: string;
  payout_id?: string;
  gateway?: string;
  gateway_customer_id?: string;
  gateway_subscription_id?: string;
  gateway_payment_id?: string;
  gross_amount?: number;
  gateway_fee?: number;
  net_amount?: number;
  commission_amount?: number;
  commission_rate?: number;
  discount_applied?: boolean;
  discount_amount?: number;
  previous_plan?: string;
  new_plan?: string;
  billing_interval?: string;
  proration_credit?: number;
  proration_charge?: number;
  days_remaining?: number;
  status?: string;
  failure_reason?: string;
  ineligibility_reason?: string;
  metadata?: any;
}) {
  try {
    await supabase.from('referral_audit_log').insert(data);
    console.log(`[asaas-webhook] 📝 Logged action: ${data.action}`);
  } catch (error) {
    console.error('[asaas-webhook] ❌ Error logging action:', error);
  }
}

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
  const isUpgrade = metadata.type === 'upgrade_proration';
  const previousPlan = metadata.previous_plan;

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
          await processPaymentForUser(profile.user_id, planName, billingInterval, payment, referralId, discountApplied, originalPrice, isUpgrade, previousPlan);
        }
      } else if (customerData?.email) {
        // Buscar por email no auth
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(customerData.email);
        if (authUser) {
          await processPaymentForUser(authUser.id, planName, billingInterval, payment, referralId, discountApplied, originalPrice, isUpgrade, previousPlan);
        }
      }
    }
    return;
  }

  await processPaymentForUser(userId, planName, billingInterval, payment, referralId, discountApplied, originalPrice, isUpgrade, previousPlan);
}

async function processPaymentForUser(
  userId: string, 
  planName: string, 
  billingInterval: string, 
  payment: any,
  referralId?: string,
  discountApplied?: boolean,
  originalPrice?: number,
  isUpgrade?: boolean,
  previousPlan?: string
) {
  console.log('[asaas-webhook] 👤 Processing payment for user:', userId);

  const amountInCents = Math.round((payment.value || 0) * 100);
  
  // Calcular taxas do gateway (valor líquido)
  const gatewayFee = Math.round(amountInCents * ASAAS_FEE_RATE) + ASAAS_FIXED_FEE;
  const netAmount = Math.max(0, amountInCents - gatewayFee);

  // Calcular data de próxima renovação (não para upgrades proration)
  if (!isUpgrade) {
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
  } else {
    // Para upgrade, apenas atualizar o plano
    await supabase
      .from('profiles')
      .update({ 
        subscription_plan: planName,
        billing_interval: billingInterval === 'yearly' ? 'yearly' : 'monthly',
        subscription_cancel_at: null
      })
      .eq('user_id', userId);

    console.log('[asaas-webhook] ✅ Plan upgraded to:', planName);

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        titulo: 'Upgrade Confirmado! 🎉',
        conteudo: `Seu upgrade para o plano ${planName === 'premium' ? 'Premium' : 'Profissional'} foi confirmado. Aproveite os novos recursos!`
      });
  }

  // Verificar se este é o primeiro pagamento (verificar se existe referral pendente)
  const { data: referralData } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .single();

  if (referralData) {
    const isFirstPayment = !referralData.first_payment_date;
    const isAnnual = billingInterval === 'yearly' || billingInterval === 'year';
    
    // Comissão é calculada sobre o valor LÍQUIDO (após taxas do gateway)
    const baseAmountForCommission = netAmount;

    // Buscar nome do indicado
    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', userId)
      .single();

    // =========================================================
    // PLANO ANUAL: Comissão de 20% calculada integralmente
    // e distribuída em 12 parcelas mensais para payout
    // =========================================================
    if (isAnnual && !isUpgrade) {
      const commissionRate = ANNUAL_COMMISSION_RATE;
      const totalAnnualCommission = Math.round(baseAmountForCommission * commissionRate);
      const monthlyPortion = Math.round(totalAnnualCommission / 12);

      console.log('[asaas-webhook] 📊 Annual commission:', {
        totalCommission: totalAnnualCommission,
        monthlyPortion,
        netAmount: baseAmountForCommission
      });

      // Atualizar referral se for primeiro pagamento
      if (isFirstPayment) {
        await supabase
          .from('referrals')
          .update({
            status: 'converted',
            subscription_plan: planName,
            subscription_amount: amountInCents,
            commission_rate: commissionRate * 100,
            commission_amount: totalAnnualCommission,
            first_payment_date: new Date().toISOString(),
          })
          .eq('id', referralData.id);

        console.log('[asaas-webhook] ✅ Referral converted to active (annual)');
      }

      // CRIAR 12 PAYOUTS PENDENTES (um para cada mês)
      const baseDate = new Date();
      const createdPayouts: any[] = [];
      
      for (let month = 0; month < 12; month++) {
        const periodStart = new Date(baseDate);
        periodStart.setMonth(periodStart.getMonth() + month);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);

        const { data: newPayout, error: payoutError } = await supabase
          .from('referral_payouts')
          .insert({
            referrer_user_id: referralData.referrer_user_id,
            referral_id: referralData.id,
            amount: monthlyPortion,
            currency: 'brl',
            status: 'pending',
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            referred_user_name: referredProfile?.nome || 'Usuário',
            referred_plan: planName,
            payment_method: 'annual_installment'
          })
          .select()
          .single();

        if (!payoutError && newPayout) {
          createdPayouts.push(newPayout);
        }
      }

      console.log('[asaas-webhook] ✅ Created', createdPayouts.length, 'annual payout installments');

      // Log da comissão anual
      await logReferralAction({
        action: isFirstPayment ? 'annual_commission_created' : 'annual_recurring_commission',
        referrer_user_id: referralData.referrer_user_id,
        referred_user_id: userId,
        referral_id: referralData.id,
        payout_id: createdPayouts[0]?.id,
        gateway: 'asaas',
        gateway_payment_id: payment.id,
        gross_amount: amountInCents,
        gateway_fee: gatewayFee,
        net_amount: baseAmountForCommission,
        commission_amount: totalAnnualCommission,
        commission_rate: commissionRate * 100,
        discount_applied: discountApplied,
        discount_amount: discountApplied && originalPrice ? originalPrice - amountInCents : 0,
        new_plan: planName,
        billing_interval: billingInterval,
        status: 'pending',
        metadata: { 
          payment_type: 'annual',
          total_commission: totalAnnualCommission,
          monthly_portion: monthlyPortion,
          installments_created: createdPayouts.length
        }
      });

      // Notificar referrer
      await supabase
        .from('notifications')
        .insert({
          user_id: referralData.referrer_user_id,
          titulo: isFirstPayment ? 'Nova Indicação Anual! 💰' : 'Renovação Anual! 💰',
          conteudo: `${referredProfile?.nome || 'Seu indicado'} ${isFirstPayment ? 'assinou' : 'renovou'} o plano ${planName === 'premium' ? 'Premium' : 'Profissional'} Anual. Você receberá R$ ${(totalAnnualCommission / 100).toFixed(2).replace('.', ',')} (20%) de comissão, distribuídos em 12 parcelas mensais de R$ ${(monthlyPortion / 100).toFixed(2).replace('.', ',')}.`,
        });

    } else if (isFirstPayment && !isUpgrade) {
      // =========================================================
      // PRIMEIRO PAGAMENTO MENSAL: 30% de comissão
      // =========================================================
      const commissionRate = FIRST_MONTH_COMMISSION_RATE;
      const commissionAmount = Math.round(baseAmountForCommission * commissionRate);

      // Atualizar referral para converted
      await supabase
        .from('referrals')
        .update({
          status: 'converted',
          subscription_plan: planName,
          subscription_amount: amountInCents,
          commission_rate: commissionRate * 100,
          commission_amount: commissionAmount,
          first_payment_date: new Date().toISOString(),
        })
        .eq('id', referralData.id);

      // Criar payout pendente
      const { data: newPayout } = await supabase
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
        })
        .select()
        .single();

      // Log da comissão criada
      await logReferralAction({
        action: 'commission_created',
        referrer_user_id: referralData.referrer_user_id,
        referred_user_id: userId,
        referral_id: referralData.id,
        payout_id: newPayout?.id,
        gateway: 'asaas',
        gateway_payment_id: payment.id,
        gross_amount: amountInCents,
        gateway_fee: gatewayFee,
        net_amount: baseAmountForCommission,
        commission_amount: commissionAmount,
        commission_rate: commissionRate * 100,
        discount_applied: discountApplied,
        discount_amount: discountApplied && originalPrice ? originalPrice - amountInCents : 0,
        new_plan: planName,
        billing_interval: billingInterval,
        status: 'pending',
        metadata: { payment_type: 'first_payment' }
      });

      // Notificar referrer
      await supabase
        .from('notifications')
        .insert({
          user_id: referralData.referrer_user_id,
          titulo: 'Indicação convertida em assinatura! 💰',
          conteudo: `${referredProfile?.nome || 'Um usuário indicado'} assinou o plano ${planName === 'premium' ? 'Premium' : 'Profissional'} através da sua indicação! Você ganhou R$ ${(commissionAmount / 100).toFixed(2).replace('.', ',')} (30%) de comissão.`,
        });

      console.log('[asaas-webhook] ✅ First payment referral processed, commission:', commissionAmount);

    } else if (referralData.status === 'converted' || isUpgrade) {
      // =========================================================
      // PAGAMENTO RECORRENTE OU UPGRADE: 15% de comissão
      // =========================================================
      const commissionRate = RECURRING_MONTHLY_COMMISSION_RATE;
      const commissionAmount = Math.round(baseAmountForCommission * commissionRate);

      // Criar payout pendente
      const { data: newPayout } = await supabase
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
        })
        .select()
        .single();

      // Log da comissão
      await logReferralAction({
        action: isUpgrade ? 'proration_commission' : 'recurring_commission',
        referrer_user_id: referralData.referrer_user_id,
        referred_user_id: userId,
        referral_id: referralData.id,
        payout_id: newPayout?.id,
        gateway: 'asaas',
        gateway_payment_id: payment.id,
        gross_amount: amountInCents,
        gateway_fee: gatewayFee,
        net_amount: baseAmountForCommission,
        commission_amount: commissionAmount,
        commission_rate: commissionRate * 100,
        previous_plan: previousPlan,
        new_plan: planName,
        billing_interval: billingInterval,
        status: 'pending',
        metadata: { payment_type: isUpgrade ? 'proration' : 'recurring' }
      });

      // Notificar referrer
      await supabase
        .from('notifications')
        .insert({
          user_id: referralData.referrer_user_id,
          titulo: isUpgrade ? 'Comissão de Upgrade! 💰' : 'Comissão Recorrente! 💰',
          conteudo: `${referredProfile?.nome || 'Seu indicado'} ${isUpgrade ? 'fez upgrade' : 'renovou a assinatura'}. Você receberá R$ ${(commissionAmount / 100).toFixed(2).replace('.', ',')} (15%) de comissão.`,
        });

      console.log('[asaas-webhook] ✅ Recurring/upgrade commission created:', commissionAmount);
    }
  } else {
    // Log de pagamento sem indicação
    await logReferralAction({
      action: isUpgrade ? 'upgrade' : 'payment',
      referred_user_id: userId,
      gateway: 'asaas',
      gateway_payment_id: payment.id,
      gross_amount: amountInCents,
      gateway_fee: gatewayFee,
      net_amount: netAmount,
      previous_plan: previousPlan,
      new_plan: planName,
      billing_interval: billingInterval,
      status: 'success',
      ineligibility_reason: 'Usuário não é indicado'
    });
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

  const amountInCents = Math.round((payment.value || 0) * 100);

  // Cancelar comissões pendentes relacionadas a este pagamento
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_user_id')
    .eq('referred_user_id', userId)
    .single();

  if (referral) {
    // Cancelar payouts pendentes
    const { data: cancelledPayouts } = await supabase
      .from('referral_payouts')
      .update({ 
        status: 'cancelled',
        failure_reason: 'Pagamento reembolsado'
      })
      .eq('referral_id', referral.id)
      .eq('status', 'pending')
      .select();

    // Log da comissão cancelada
    if (cancelledPayouts && cancelledPayouts.length > 0) {
      for (const payout of cancelledPayouts) {
        await logReferralAction({
          action: 'commission_cancelled',
          referrer_user_id: referral.referrer_user_id,
          referred_user_id: userId,
          referral_id: referral.id,
          payout_id: payout.id,
          gateway: 'asaas',
          gateway_payment_id: payment.id,
          gross_amount: amountInCents,
          commission_amount: payout.amount,
          status: 'cancelled',
          failure_reason: 'Pagamento reembolsado'
        });
      }
    }

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

  // Log do cancelamento
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_user_id')
    .eq('referred_user_id', userId)
    .single();

  if (referral) {
    await logReferralAction({
      action: 'cancel',
      referrer_user_id: referral.referrer_user_id,
      referred_user_id: userId,
      referral_id: referral.id,
      gateway: 'asaas',
      status: 'success',
      metadata: { reason: 'subscription_cancelled' }
    });
  }

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
