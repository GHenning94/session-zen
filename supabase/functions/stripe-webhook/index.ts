import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ==========================================
// TAXAS DE COMISSÃO DO PROGRAMA DE INDICAÇÃO
// ==========================================
const FIRST_MONTH_COMMISSION_RATE = 0.30;      // 30% primeiro mês mensal
const RECURRING_MONTHLY_COMMISSION_RATE = 0.15; // 15% meses seguintes mensal  
const ANNUAL_COMMISSION_RATE = 0.20;           // 20% anual (pago 1/12 por mês)

// Taxa do Stripe (aproximada para cálculo de comissão líquida)
const STRIPE_FEE_RATE = 0.0399; // 3.99% + R$0.39
const STRIPE_FIXED_FEE = 39;    // R$0.39 em centavos

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
    console.log(`[stripe-webhook] 📝 Logged action: ${data.action}`);
  } catch (error) {
    console.error('[stripe-webhook] ❌ Error logging action:', error);
  }
}

/**
 * =========================================================
 * VERIFICAÇÃO DE IDEMPOTÊNCIA
 * Evita criar comissões duplicadas em retries de webhook
 * Inclui gateway_event_id para cobertura de retries extremos
 * =========================================================
 */
async function checkIdempotency(invoiceId: string, eventId: string, paymentType: string): Promise<boolean> {
  const { data: existingPayout } = await supabase
    .from('referral_payouts')
    .select('id')
    .eq('gateway_invoice_id', invoiceId)
    .eq('gateway_event_id', eventId)
    .eq('payment_type', paymentType)
    .maybeSingle();
  
  if (existingPayout) {
    console.log(`[stripe-webhook] ⚠️ Idempotency check: Payout already exists for invoice ${invoiceId}, event ${eventId}, type ${paymentType}`);
    return true; // Já processado
  }
  return false;
}

/**
 * =========================================================
 * VERIFICAÇÃO ANTIFRAUDE LEVE (ENTERPRISE)
 * Detecta padrões suspeitos entre indicador e indicado
 * - CPF/telefone iguais
 * - Fingerprint de cartão compartilhado
 * - Stripe customer_id compartilhado
 * - IPs recorrentes
 * =========================================================
 */
async function checkFraudSignals(referrerId: string, referredId: string, customerId: string): Promise<{
  blocked: boolean;
  signals: string[];
}> {
  const signals: string[] = [];
  
  try {
    // Buscar dados do referrer e referred
    const [referrerProfile, referredProfile] = await Promise.all([
      supabase.from('profiles').select('cpf_cnpj, telefone, stripe_customer_id').eq('user_id', referrerId).single(),
      supabase.from('profiles').select('cpf_cnpj, telefone, stripe_customer_id').eq('user_id', referredId).single()
    ]);

    const referrer = referrerProfile.data;
    const referred = referredProfile.data;

    // 1. Mesmo CPF/CNPJ
    if (referrer?.cpf_cnpj && referred?.cpf_cnpj) {
      const cleanReferrerCpf = referrer.cpf_cnpj.replace(/\D/g, '');
      const cleanReferredCpf = referred.cpf_cnpj.replace(/\D/g, '');
      if (cleanReferrerCpf === cleanReferredCpf) {
        signals.push('same_cpf');
        await supabase.from('referral_fraud_signals').insert({
          referrer_user_id: referrerId,
          referred_user_id: referredId,
          signal_type: 'same_cpf',
          signal_value: `***${cleanReferrerCpf.slice(-4)}`,
          action_taken: 'blocked'
        });
      }
    }

    // 2. Mesmo telefone
    if (referrer?.telefone && referred?.telefone) {
      const cleanReferrerPhone = referrer.telefone.replace(/\D/g, '');
      const cleanReferredPhone = referred.telefone.replace(/\D/g, '');
      if (cleanReferrerPhone === cleanReferredPhone) {
        signals.push('same_phone');
        await supabase.from('referral_fraud_signals').insert({
          referrer_user_id: referrerId,
          referred_user_id: referredId,
          signal_type: 'same_phone',
          signal_value: `***${cleanReferrerPhone.slice(-4)}`,
          action_taken: 'blocked'
        });
      }
    }

    // 3. Stripe customer_id compartilhado (mesmo cliente no Stripe)
    if (referrer?.stripe_customer_id && referred?.stripe_customer_id) {
      if (referrer.stripe_customer_id === referred.stripe_customer_id) {
        signals.push('shared_customer_id');
        await supabase.from('referral_fraud_signals').insert({
          referrer_user_id: referrerId,
          referred_user_id: referredId,
          signal_type: 'shared_customer_id',
          signal_value: `***${referrer.stripe_customer_id.slice(-8)}`,
          action_taken: 'blocked'
        });
      }
    }

    // 4. Verificar cartões iguais no Stripe (mesmo fingerprint)
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      // Buscar customer do referrer
      if (referrer?.stripe_customer_id) {
        const referrerPaymentMethods = await stripe.paymentMethods.list({
          customer: referrer.stripe_customer_id,
          type: 'card'
        });

        // Comparar fingerprints
        const referredFingerprints = paymentMethods.data.map(pm => pm.card?.fingerprint).filter(Boolean);
        const referrerFingerprints = referrerPaymentMethods.data.map(pm => pm.card?.fingerprint).filter(Boolean);
        
        const sharedFingerprints = referredFingerprints.filter(fp => referrerFingerprints.includes(fp));
        
        if (sharedFingerprints.length > 0) {
          signals.push('same_card');
          await supabase.from('referral_fraud_signals').insert({
            referrer_user_id: referrerId,
            referred_user_id: referredId,
            signal_type: 'same_card',
            signal_value: `fingerprint_match`,
            action_taken: 'blocked'
          });
        }
      }
    } catch (stripeError) {
      console.log('[stripe-webhook] ⚠️ Could not check card fingerprints:', stripeError);
    }

    // 5. Verificar IPs compartilhados (se tabela de fingerprints tiver dados)
    try {
      const { data: referrerIps } = await supabase
        .from('user_login_fingerprints')
        .select('ip_address')
        .eq('user_id', referrerId);
      
      const { data: referredIps } = await supabase
        .from('user_login_fingerprints')
        .select('ip_address')
        .eq('user_id', referredId);

      if (referrerIps && referredIps) {
        const referrerIpSet = new Set(referrerIps.map(r => r.ip_address));
        const sharedIps = referredIps.filter(r => referrerIpSet.has(r.ip_address));
        
        if (sharedIps.length > 0) {
          signals.push('same_ip');
          await supabase.from('referral_fraud_signals').insert({
            referrer_user_id: referrerId,
            referred_user_id: referredId,
            signal_type: 'same_ip',
            signal_value: `${sharedIps.length} shared IPs`,
            action_taken: 'warning' // IP compartilhado é apenas warning, não bloqueia
          });
        }
      }
    } catch (ipError) {
      console.log('[stripe-webhook] ⚠️ Could not check IPs:', ipError);
    }

    // =========================================================
    // REGRAS DE BLOQUEIO ANTIFRAUDE (ENTERPRISE)
    // =========================================================
    // 
    // SINAIS CRÍTICOS (bloqueiam imediatamente):
    // - same_cpf: Indicador e indicado têm o mesmo CPF
    // - same_card: Indicador e indicado usam o mesmo cartão (fingerprint)
    // - shared_customer_id: Indicador e indicado são o mesmo cliente no Stripe
    //
    // SINAIS DE WARNING (não bloqueiam sozinhos):
    // - same_phone: Mesmo telefone
    // - same_ip: IPs compartilhados
    // - same_device: Device fingerprint compartilhado (futuro)
    //
    // REGRA COMBINADA:
    // - IP sozinho NUNCA bloqueia
    // - 2+ warnings simultâneos = BLOQUEIO AUTOMÁTICO
    // =========================================================
    
    const criticalSignals = ['same_cpf', 'same_card', 'shared_customer_id'];
    const warningSignals = ['same_phone', 'same_ip', 'same_device'];
    
    const hasCriticalSignal = signals.some(s => criticalSignals.includes(s));
    const warningCount = signals.filter(s => warningSignals.includes(s)).length;
    
    // Bloqueio: sinal crítico OU 2+ warnings simultâneos
    const blocked = hasCriticalSignal || warningCount >= 2;
    
    // Log detalhado
    if (signals.length > 0) {
      const blockReason = hasCriticalSignal 
        ? `CRITICAL SIGNAL (${signals.filter(s => criticalSignals.includes(s)).join(', ')})`
        : warningCount >= 2 
          ? `COMBINED WARNINGS (${warningCount} signals: ${signals.filter(s => warningSignals.includes(s)).join(' + ')})`
          : `WARNING ONLY (${warningCount} signal, needs 2+ to block)`;
      
      console.log(`[stripe-webhook] 🚨 Fraud signals detected:`, signals, blocked ? `(BLOCKED: ${blockReason})` : `(${blockReason})`);
      
      // Se bloqueado por warnings combinados, registrar ação especial
      if (blocked && !hasCriticalSignal && warningCount >= 2) {
        await supabase.from('referral_fraud_signals').insert({
          referrer_user_id: referrerId,
          referred_user_id: referredId,
          signal_type: 'combined_warnings',
          signal_value: signals.filter(s => warningSignals.includes(s)).join('+'),
          action_taken: 'blocked',
          notes: `Auto-blocked: ${warningCount} simultaneous warning signals`
        });
      }
    }

    return { blocked, signals };
  } catch (error) {
    console.error('[stripe-webhook] ❌ Error checking fraud signals:', error);
    return { blocked: false, signals: [] };
  }
}

/**
 * Stripe Webhook - Processa pagamentos e calcula comissões
 * 
 * TODOS os usuários pagam via Stripe
 * Comissões são calculadas aqui e pagas via Asaas (payout automático)
 */
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    // ✅ MODO 1: Verificação com webhook secret (mais seguro)
    if (signature && webhookSecret) {
      console.log('[stripe-webhook] 🔐 Using signature verification');
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('[stripe-webhook] ❌ Signature verification failed:', err);
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } 
    // ✅ MODO 2: Fallback - Verificar evento diretamente na API do Stripe
    else {
      console.log('[stripe-webhook] ⚠️ No webhook secret configured, using API verification');
      
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        console.error('[stripe-webhook] ❌ Failed to parse request body');
        return new Response("Invalid JSON body", { status: 400 });
      }

      if (!parsedBody.id || !parsedBody.type) {
        console.error('[stripe-webhook] ❌ Missing event id or type');
        return new Response("Invalid event format", { status: 400 });
      }

      try {
        event = await stripe.events.retrieve(parsedBody.id);
        console.log('[stripe-webhook] ✅ Event verified via API:', event.id);
      } catch (err) {
        console.error('[stripe-webhook] ❌ Event not found in Stripe:', parsedBody.id);
        return new Response("Event not found in Stripe", { status: 404 });
      }
    }

    console.log(`[stripe-webhook] 📨 Processing event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id);
        break;
      }

      case "customer.subscription.created": {
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }

      case "charge.refunded": {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }

      default:
        console.log(`[stripe-webhook] ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[stripe-webhook] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  
  // Buscar metadata do checkout
  let userId = session.metadata?.user_id;
  let planName = session.metadata?.plan_name || 'pro';
  let billingInterval = session.metadata?.billing_interval || 'monthly';
  const isReferred = session.metadata?.is_referred === 'true';
  const referralId = session.metadata?.referral_id;
  const referrerUserId = session.metadata?.referrer_user_id;
  const discountApplied = session.metadata?.discount_applied === 'true';

  // Se não encontrar userId nos metadados da sessão, buscar do customer
  if (!userId) {
    console.log('[stripe-webhook] Buscando user_id pelo customer_id:', customerId)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (profile) {
      userId = profile.user_id;
      console.log('[stripe-webhook] User_id encontrado no perfil:', userId)
    }
  }

  if (!userId) {
    console.error('[stripe-webhook] ❌ No user_id found in session or customer');
    return;
  }

  console.log('[stripe-webhook] 💳 Checkout completed:', {
    user: userId,
    plan: planName,
    interval: billingInterval,
    customer: customerId,
    subscription: subscriptionId,
    isReferred,
    referralId,
    discountApplied,
  });
  
  // ✅ BUSCAR DATA REAL DO STRIPE: Obter a assinatura para pegar o current_period_end correto
  let nextBillingDate: Date;
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
    console.log('[stripe-webhook] 📅 Using Stripe subscription period_end:', nextBillingDate.toISOString());
  } catch (subError) {
    // Fallback: calcular manualmente se não conseguir buscar do Stripe
    console.log('[stripe-webhook] ⚠️ Could not fetch subscription, calculating date manually');
    const currentDate = new Date();
    nextBillingDate = new Date(currentDate);
    
    if (billingInterval === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
  }

  // Atualizar perfil com informações completas da assinatura
  const profileUpdate: any = { 
    subscription_plan: planName,
    billing_interval: billingInterval,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_end_date: nextBillingDate.toISOString(),
    subscription_cancel_at: null
  };

  // Marcar desconto como usado se aplicado
  if (discountApplied) {
    profileUpdate.professional_discount_used = true;
    console.log('[stripe-webhook] ✅ Marking discount as used for user:', userId);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('user_id', userId);

  if (updateError) {
    console.error('[stripe-webhook] ❌ Error updating profile:', updateError);
    return;
  }

  console.log('[stripe-webhook] ✅ Profile updated successfully to plan:', planName);
  
  // Criar notificação de boas-vindas
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      titulo: 'Bem-vindo ao TherapyPro!',
      conteudo: `Sua assinatura ${planName === 'premium' ? 'Premium' : 'Profissional'} foi ativada com sucesso. Aproveite todos os recursos!`
    });

  // Enviar email de upgrade com recibo
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 1
    });
    
    const invoice = invoices.data[0];
    
    const emailPayload = {
      userId,
      planName,
      billingInterval,
      invoiceUrl: invoice?.hosted_invoice_url || null,
      invoicePdf: invoice?.invoice_pdf || null,
      amount: invoice?.amount_paid || session.amount_total
    };
    
    console.log('[stripe-webhook] 📧 Sending upgrade email with payload:', emailPayload);
    
    const emailResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-upgrade-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify(emailPayload)
      }
    );
    
    if (emailResponse.ok) {
      console.log('[stripe-webhook] ✅ Upgrade email sent successfully');
    } else {
      const emailError = await emailResponse.text();
      console.error('[stripe-webhook] ⚠️ Failed to send upgrade email:', emailError);
    }
  } catch (emailErr) {
    console.error('[stripe-webhook] ⚠️ Error sending upgrade email:', emailErr);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
  const customerId = invoice.customer as string;
  const amountInCents = invoice.amount_paid || 0;
  const invoiceId = invoice.id;
  const subscriptionId = invoice.subscription as string;

  // Detectar se é pagamento de prorrata (upgrade)
  const isProration = invoice.billing_reason === 'subscription_update' || 
                      invoice.billing_reason === 'subscription_cycle' ||
                      (invoice.lines?.data?.some(line => line.proration === true));
  
  const hasProrationItems = invoice.lines?.data?.some(line => line.proration === true);

  console.log('[stripe-webhook] 💰 Payment succeeded for invoice:', invoiceId, {
    Amount: amountInCents,
    billing_reason: invoice.billing_reason,
    isProration,
    hasProrationItems
  });

  // Verificar se invoice tem desconto de indicação aplicado (downgrade)
  const hasReferralDiscount = invoice.discount?.coupon?.metadata?.type === 'referral_discount_downgrade' ||
                              invoice.discount?.coupon?.metadata?.type === 'referral_discount';
  const discountUserId = invoice.discount?.coupon?.metadata?.user_id;

  // Buscar usuário pelo stripe_customer_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, subscription_plan, billing_interval, professional_discount_used')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('[stripe-webhook] ❌ Profile not found for customer:', customerId);
    return;
  }

  const userId = profile.user_id;
  let planName = profile.subscription_plan || 'pro';
  const billingInterval = profile.billing_interval || 'monthly';

  // Detectar mudança de plano via subscription schedule (downgrade)
  const isScheduledChange = invoice.billing_reason === 'subscription_cycle' && invoice.subscription;
  if (isScheduledChange) {
    // Buscar assinatura para ver o plano atual
    try {
      const subscriptionResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${invoice.subscription}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
        }
      });
      const subscriptionData = await subscriptionResponse.json();
      const currentPriceId = subscriptionData?.items?.data?.[0]?.price?.id;
      
      // Mapear price ID para plano
      const priceToPlans: { [key: string]: string } = {
        'price_1SSMNgCP57sNVd3laEmlQOcb': 'pro',
        'price_1SSMOdCP57sNVd3la4kMOinN': 'pro',
        'price_1SSMOBCP57sNVd3lqjfLY6Du': 'premium',
        'price_1SSMP7CP57sNVd3lSf4oYINX': 'premium'
      };
      
      if (currentPriceId && priceToPlans[currentPriceId]) {
        const newPlan = priceToPlans[currentPriceId];
        if (newPlan !== planName) {
          console.log(`[stripe-webhook] 📊 Plan changed from ${planName} to ${newPlan} (scheduled)`);
          planName = newPlan;
          
          // Atualizar plano no perfil
          await supabase
            .from('profiles')
            .update({ subscription_plan: newPlan })
            .eq('user_id', userId);
        }
      }
    } catch (e) {
      console.error('[stripe-webhook] ⚠️ Error fetching subscription details:', e);
    }
  }

  // Marcar desconto como usado se aplicado neste pagamento
  if (hasReferralDiscount && !profile.professional_discount_used) {
    console.log('[stripe-webhook] 🎁 Marking referral discount as used for user:', userId);
    await supabase
      .from('profiles')
      .update({ professional_discount_used: true })
      .eq('user_id', userId);
  }

  // Só atualizar data de renovação para cobranças normais (não prorrata)
  if (!hasProrationItems && invoice.period_end) {
    const nextBillingDate = new Date(invoice.period_end * 1000);
    
    await supabase
      .from('profiles')
      .update({
        subscription_end_date: nextBillingDate.toISOString(),
        subscription_cancel_at: null
      })
      .eq('user_id', userId);

    console.log('[stripe-webhook] ✅ Next billing date updated:', nextBillingDate.toISOString());
  }

  // Notificar usuário
  const discountNote = hasReferralDiscount ? ' (com 20% de desconto de indicação!)' : '';
  const notificationContent = hasProrationItems
    ? `Seu pagamento de upgrade (prorrata) de R$ ${(amountInCents / 100).toFixed(2)} foi processado com sucesso!`
    : `Seu pagamento de R$ ${(amountInCents / 100).toFixed(2)}${discountNote} foi processado com sucesso.`;

  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      titulo: hasProrationItems ? 'Upgrade Confirmado' : 'Pagamento Confirmado',
      conteudo: notificationContent
    });

  // ========================================
  // PROCESSAR COMISSÃO DE INDICAÇÃO
  // ========================================
  
  // Verificar se usuário foi indicado
  const { data: referralData } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .single();

  if (!referralData) {
    console.log('[stripe-webhook] ℹ️ User is not referred, no commission to process');
    await logReferralAction({
      action: 'payment',
      referred_user_id: userId,
      gateway: 'stripe',
      gateway_payment_id: invoiceId,
      gateway_customer_id: customerId,
      gross_amount: amountInCents,
      new_plan: planName,
      billing_interval: billingInterval,
      status: 'success',
      ineligibility_reason: 'User is not referred'
    });
    return;
  }

  // =========================================================
  // VERIFICAÇÃO ANTIFRAUDE
  // =========================================================
  const fraudCheck = await checkFraudSignals(referralData.referrer_user_id, userId, customerId);
  
  if (fraudCheck.blocked) {
    console.log('[stripe-webhook] 🚫 Commission blocked due to fraud signals:', fraudCheck.signals);
    await logReferralAction({
      action: 'commission_blocked_fraud',
      referrer_user_id: referralData.referrer_user_id,
      referred_user_id: userId,
      referral_id: referralData.id,
      gateway: 'stripe',
      gateway_payment_id: invoiceId,
      gross_amount: amountInCents,
      new_plan: planName,
      billing_interval: billingInterval,
      status: 'blocked',
      ineligibility_reason: `Fraud signals: ${fraudCheck.signals.join(', ')}`
    });
    return;
  }

  // Verificar se afiliado ainda está ativo no programa
  const { data: referrerProfile } = await supabase
    .from('profiles')
    .select('is_referral_partner, nome, bank_details_validated')
    .eq('user_id', referralData.referrer_user_id)
    .single();

  if (!referrerProfile?.is_referral_partner) {
    console.log('[stripe-webhook] ⚠️ Referrer is no longer a partner, no commission');
    await logReferralAction({
      action: 'payment',
      referrer_user_id: referralData.referrer_user_id,
      referred_user_id: userId,
      referral_id: referralData.id,
      gateway: 'stripe',
      gateway_payment_id: invoiceId,
      gross_amount: amountInCents,
      new_plan: planName,
      billing_interval: billingInterval,
      status: 'ineligible',
      ineligibility_reason: 'Referrer is no longer a partner'
    });
    return;
  }

  // Calcular taxas do gateway (valor líquido)
  const gatewayFee = Math.round(amountInCents * STRIPE_FEE_RATE) + STRIPE_FIXED_FEE;
  const netAmount = Math.max(0, amountInCents - gatewayFee);

  // Determinar se é primeiro pagamento
  const isFirstPayment = !referralData.first_payment_date;
  const isAnnual = billingInterval === 'yearly';

  // Calcular comissão baseado nas regras
  let commissionRate: number;
  let commissionAmount: number;
  let paymentType: string = 'recurring';

  if (isAnnual && !hasProrationItems) {
    // =========================================================
    // PLANO ANUAL: Comissão de 20% calculada integralmente
    // e distribuída em 12 parcelas mensais para payout
    // =========================================================
    
    // IDEMPOTÊNCIA: Verificar se já processou este invoice para annual
    if (await checkIdempotency(invoiceId, eventId, 'annual_installment')) {
      console.log('[stripe-webhook] ⚠️ Annual commission already processed for invoice:', invoiceId);
      return;
    }
    
    commissionRate = ANNUAL_COMMISSION_RATE;
    const totalAnnualCommission = Math.round(netAmount * commissionRate);
    const monthlyPortion = Math.round(totalAnnualCommission / 12);
    paymentType = 'annual_installment';
    
    console.log('[stripe-webhook] 📊 Annual commission:', {
      totalCommission: totalAnnualCommission,
      monthlyPortion,
      netAmount
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
      
      console.log('[stripe-webhook] ✅ Referral converted to active (annual)');
    }

    // Buscar nome do indicado
    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', userId)
      .single();

    // CRIAR 12 PAYOUTS PENDENTES COM SNAPSHOT COMPLETO
    const baseDate = new Date();
    const createdPayouts: any[] = [];
    
    for (let month = 0; month < 12; month++) {
      const periodStart = new Date(baseDate);
      periodStart.setMonth(periodStart.getMonth() + month);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      // Deadline de aprovação: 15 dias após o início do período
      const approvalDeadline = new Date(periodStart);
      approvalDeadline.setDate(approvalDeadline.getDate() + 15);

      const { data: newPayout, error: payoutError } = await supabase
        .from('referral_payouts')
        .insert({
          referrer_user_id: referralData.referrer_user_id,
          referral_id: referralData.id,
          referred_user_id: userId,
          amount: monthlyPortion,
          currency: 'brl',
          status: 'pending',
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          referred_user_name: referredProfile?.nome || 'Usuário',
          referred_plan: planName,
          payment_method: 'annual_installment',
          // ✅ DEADLINE: 15 dias após início do período
          approval_deadline: approvalDeadline.toISOString().split('T')[0],
          // ✅ SNAPSHOT: Dados congelados no momento do cálculo
          gateway_invoice_id: invoiceId,
          gateway_event_id: eventId,
          gateway_subscription_id: subscriptionId,
          amount_paid: amountInCents,
          net_amount: netAmount,
          gateway_fee: gatewayFee,
          commission_rate: commissionRate * 100,
          billing_interval: billingInterval,
          payment_type: 'annual_installment'
        })
        .select()
        .single();

      if (!payoutError && newPayout) {
        createdPayouts.push(newPayout);
      }
    }

    console.log('[stripe-webhook] ✅ Created', createdPayouts.length, 'annual payout installments');

    // Log da comissão anual
    await logReferralAction({
      action: isFirstPayment ? 'annual_commission_created' : 'annual_recurring_commission',
      referrer_user_id: referralData.referrer_user_id,
      referred_user_id: userId,
      referral_id: referralData.id,
      payout_id: createdPayouts[0]?.id,
      gateway: 'stripe',
      gateway_payment_id: invoiceId,
      gateway_customer_id: customerId,
      gross_amount: amountInCents,
      gateway_fee: gatewayFee,
      net_amount: netAmount,
      commission_amount: totalAnnualCommission,
      commission_rate: commissionRate * 100,
      new_plan: planName,
      billing_interval: billingInterval,
      status: 'pending',
      metadata: { 
        payment_type: 'annual',
        total_commission: totalAnnualCommission,
        monthly_portion: monthlyPortion,
        installments_created: createdPayouts.length,
        fraud_signals: fraudCheck.signals
      }
    });

    // Notificar afiliado
    await supabase
      .from('notifications')
      .insert({
        user_id: referralData.referrer_user_id,
        titulo: isFirstPayment ? 'Nova Indicação Anual! 💰' : 'Renovação Anual! 💰',
        conteudo: `${referredProfile?.nome || 'Seu indicado'} ${isFirstPayment ? 'assinou' : 'renovou'} o plano ${planName === 'premium' ? 'Premium' : 'Profissional'} Anual. Você receberá R$ ${(totalAnnualCommission / 100).toFixed(2).replace('.', ',')} (20%) de comissão, distribuídos em 12 parcelas mensais de R$ ${(monthlyPortion / 100).toFixed(2).replace('.', ',')}.`,
      });

    return; // Processamento anual concluído
  } 
  
  if (hasProrationItems) {
    // PRORRATA de upgrade: 15% recorrente (nunca é primeiro pagamento pois já assinou)
    paymentType = 'proration';
    
    // IDEMPOTÊNCIA
    if (await checkIdempotency(invoiceId, eventId, paymentType)) {
      console.log('[stripe-webhook] ⚠️ Proration commission already processed for invoice:', invoiceId);
      return;
    }
    
    commissionRate = RECURRING_MONTHLY_COMMISSION_RATE; // 15%
    commissionAmount = Math.round(netAmount * commissionRate);
    console.log('[stripe-webhook] 📊 Proration commission (15%):', commissionAmount);
  } else {
    // Plano mensal: 30% primeiro mês, 15% recorrente
    paymentType = isFirstPayment ? 'first_payment' : 'recurring';
    
    // IDEMPOTÊNCIA
    if (await checkIdempotency(invoiceId, eventId, paymentType)) {
      console.log('[stripe-webhook] ⚠️ Commission already processed for invoice:', invoiceId);
      return;
    }
    
    commissionRate = isFirstPayment ? FIRST_MONTH_COMMISSION_RATE : RECURRING_MONTHLY_COMMISSION_RATE;
    commissionAmount = Math.round(netAmount * commissionRate);
    console.log('[stripe-webhook] 📊 Monthly commission:', commissionAmount, isFirstPayment ? '(first month)' : '(recurring)');
  }

  // Atualizar referral se for primeiro pagamento
  if (isFirstPayment) {
    await supabase
      .from('referrals')
      .update({
        status: 'converted',
        subscription_plan: planName,
        subscription_amount: amountInCents,
        commission_rate: commissionRate * 100,
        first_payment_date: new Date().toISOString(),
      })
      .eq('id', referralData.id);
    
    console.log('[stripe-webhook] ✅ Referral converted to active');
  }

  // Buscar nome do indicado
  const { data: referredProfile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('user_id', userId)
    .single();

  // Criar payout pendente COM SNAPSHOT COMPLETO
  // Incluir approval_deadline de 15 dias para aprovação automática
  const approvalDeadline = new Date();
  approvalDeadline.setDate(approvalDeadline.getDate() + 15);
  
  const { data: newPayout, error: payoutError } = await supabase
    .from('referral_payouts')
    .insert({
      referrer_user_id: referralData.referrer_user_id,
      referral_id: referralData.id,
      referred_user_id: userId,
      amount: commissionAmount,
      currency: 'brl',
      status: 'pending',
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      referred_user_name: referredProfile?.nome || 'Usuário',
      referred_plan: planName,
      // ✅ DEADLINE: 15 dias para aprovação automática
      approval_deadline: approvalDeadline.toISOString().split('T')[0],
      // ✅ SNAPSHOT: Dados congelados no momento do cálculo
      gateway_invoice_id: invoiceId,
      gateway_event_id: eventId,
      gateway_subscription_id: subscriptionId,
      amount_paid: amountInCents,
      net_amount: netAmount,
      gateway_fee: gatewayFee,
      commission_rate: commissionRate * 100,
      billing_interval: billingInterval,
      payment_type: paymentType
    })
    .select()
    .single();

  if (payoutError) {
    console.error('[stripe-webhook] ❌ Error creating payout:', payoutError);
  } else {
    console.log('[stripe-webhook] ✅ Payout created:', newPayout.id, 'Amount:', commissionAmount);
  }

  // Log da comissão
  const actionName = hasProrationItems 
    ? 'proration_commission' 
    : (isFirstPayment ? 'commission_created' : 'recurring_commission');
    
  await logReferralAction({
    action: actionName,
    referrer_user_id: referralData.referrer_user_id,
    referred_user_id: userId,
    referral_id: referralData.id,
    payout_id: newPayout?.id,
    gateway: 'stripe',
    gateway_payment_id: invoiceId,
    gateway_customer_id: customerId,
    gross_amount: amountInCents,
    gateway_fee: gatewayFee,
    net_amount: netAmount,
    commission_amount: commissionAmount,
    commission_rate: commissionRate * 100,
    new_plan: planName,
    billing_interval: billingInterval,
    status: 'pending',
    metadata: { 
      payment_type: paymentType,
      is_proration: hasProrationItems,
      fraud_signals: fraudCheck.signals
    }
  });

  // Notificar afiliado
  const rateDisplay = paymentType === 'first_payment' ? '30%' : '15%';
  const actionText = hasProrationItems 
    ? 'fez upgrade para' 
    : (isFirstPayment ? 'assinou' : 'renovou');
    
  await supabase
    .from('notifications')
    .insert({
      user_id: referralData.referrer_user_id,
      titulo: hasProrationItems 
        ? 'Comissão de Upgrade! 💰' 
        : (isFirstPayment ? 'Nova Indicação Convertida! 💰' : 'Comissão Recorrente! 💰'),
      conteudo: `${referredProfile?.nome || 'Seu indicado'} ${actionText} o plano ${planName === 'premium' ? 'Premium' : 'Profissional'}. Você receberá R$ ${(commissionAmount / 100).toFixed(2).replace('.', ',')} (${rateDisplay}) de comissão.`,
    });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('[stripe-webhook] 🆕 Subscription created:', {
    subscription: subscription.id,
    customer: customerId,
    status: subscription.status,
    metadata: subscription.metadata
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('[stripe-webhook] ❌ Profile not found for customer:', customerId);
    return;
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
    console.error('[stripe-webhook] ❌ Error updating subscription:', updateError);
  } else {
    console.log('[stripe-webhook] ✅ Subscription created and profile updated:', planName);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('[stripe-webhook] 🔄 Subscription updated:', {
    subscription: subscription.id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, subscription_plan')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('[stripe-webhook] ❌ Profile not found for customer:', customerId);
    return;
  }

  const isActive = subscription.status === 'active';
  const priceId = subscription.items.data[0]?.price.id;
  
  const priceToPlans: { [key: string]: string } = {
    'price_1SSMNgCP57sNVd3laEmlQOcb': 'pro',
    'price_1SSMOdCP57sNVd3la4kMOinN': 'pro',
    'price_1SSMOBCP57sNVd3lqjfLY6Du': 'premium',
    'price_1SSMP7CP57sNVd3lSf4oYINX': 'premium'
  };
  
  let newPlanName = priceId && priceToPlans[priceId] ? priceToPlans[priceId] : profile.subscription_plan;
  const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';

  // ✅ ATUALIZAÇÃO COMPLETA: Inclui data de renovação (próxima cobrança)
  const nextBillingDate = new Date(subscription.current_period_end * 1000);
  
  const updateData: any = {
    subscription_plan: isActive ? newPlanName : 'basico',
    billing_interval: isActive ? (billingInterval === 'year' ? 'yearly' : 'monthly') : null,
    subscription_end_date: isActive ? nextBillingDate.toISOString() : null,
    stripe_subscription_id: subscription.id,
  };

  // ✅ PERÍODO DE CARÊNCIA: Se cancelado, manter acesso até o fim do período
  if (subscription.cancel_at_period_end || subscription.cancel_at) {
    updateData.subscription_cancel_at = subscription.cancel_at 
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : new Date(subscription.current_period_end * 1000).toISOString();
    
    console.log('[stripe-webhook] ⚠️ Subscription will cancel at:', updateData.subscription_cancel_at);
  } else {
    updateData.subscription_cancel_at = null;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('user_id', profile.user_id);

  if (updateError) {
    console.error('[stripe-webhook] ❌ Error updating subscription:', updateError);
    return;
  }

  console.log('[stripe-webhook] ✅ Subscription updated successfully:', {
    plan: newPlanName,
    nextBilling: nextBillingDate.toISOString()
  });

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

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('[stripe-webhook] 🗑️ Subscription deleted:', subscription.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // ✅ Reverter para plano gratuito
  await supabase
    .from('profiles')
    .update({ 
      subscription_plan: 'basico',
      billing_interval: null,
      subscription_cancel_at: null,
      subscription_end_date: null,
      stripe_subscription_id: null
    })
    .eq('user_id', profile.user_id);

  console.log('[stripe-webhook] ✅ User reverted to basic plan');
  
  await supabase
    .from('notifications')
    .insert({
      user_id: profile.user_id,
      titulo: 'Seu plano foi alterado',
      conteudo: 'Seu plano foi migrado para o plano Básico. Não se preocupe: todos os seus dados continuam salvos na plataforma! Caso faça upgrade novamente, suas informações estarão exatamente onde você deixou.'
    });

  // Cancelar comissões pendentes do afiliado
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_user_id')
    .eq('referred_user_id', profile.user_id)
    .single();

  if (referral) {
    await supabase
      .from('referral_payouts')
      .update({ 
        status: 'cancelled',
        failure_reason: 'Assinatura cancelada'
      })
      .eq('referral_id', referral.id)
      .eq('status', 'pending');

    await logReferralAction({
      action: 'subscription_cancelled',
      referrer_user_id: referral.referrer_user_id,
      referred_user_id: profile.user_id,
      referral_id: referral.id,
      gateway: 'stripe',
      status: 'cancelled',
      failure_reason: 'Subscription deleted'
    });
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('[stripe-webhook] 💸 Charge refunded:', charge.id);

  const customerId = charge.customer as string;
  if (!customerId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Cancelar comissões pendentes relacionadas
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_user_id')
    .eq('referred_user_id', profile.user_id)
    .single();

  if (referral) {
    const { data: cancelledPayouts } = await supabase
      .from('referral_payouts')
      .update({ 
        status: 'cancelled',
        failure_reason: 'Pagamento reembolsado'
      })
      .eq('referral_id', referral.id)
      .eq('status', 'pending')
      .select();

    if (cancelledPayouts && cancelledPayouts.length > 0) {
      for (const payout of cancelledPayouts) {
        await logReferralAction({
          action: 'commission_cancelled',
          referrer_user_id: referral.referrer_user_id,
          referred_user_id: profile.user_id,
          referral_id: referral.id,
          payout_id: payout.id,
          gateway: 'stripe',
          gateway_payment_id: charge.id,
          commission_amount: payout.amount,
          status: 'cancelled',
          failure_reason: 'Charge refunded'
        });
      }
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[stripe-webhook] ❌ Payment failed for invoice:', invoice.id);

  const customerId = invoice.customer as string;
  if (!customerId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profile) {
    await supabase
      .from('notifications')
      .insert({
        user_id: profile.user_id,
        titulo: 'Pagamento Falhou',
        conteudo: 'Houve um problema com seu pagamento. Por favor, atualize suas informações de pagamento para manter seu acesso.'
      });
  }
}
