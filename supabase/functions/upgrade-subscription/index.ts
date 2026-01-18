import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * REGRAS DE PRORRATA PARA UPGRADE - TherapyPro
 * 
 * REGRA FUNDAMENTAL:
 * A prorrata SÓ é aplicada quando o plano atual está sendo pago pelo valor CHEIO,
 * sem qualquer tipo de desconto, cupom, promoção, indicação ou mês grátis.
 * 
 * Se houver QUALQUER desconto ativo:
 * - Crédito = R$ 0,00
 * - Usuário paga 100% do novo plano
 */

// Price map com valores em centavos (valor CHEIO, sem descontos)
const PRICE_MAP: Record<string, { plan: string; interval: string; price: number; displayName: string }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 2990, displayName: 'Profissional Mensal' },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 29900, displayName: 'Profissional Anual' },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 4990, displayName: 'Premium Mensal' },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 49900, displayName: 'Premium Anual' }
};

// Base fixa para cálculo de prorrata
const PRORATION_BASE_DAYS = 30;

/**
 * Calcula o crédito proporcional do plano atual
 */
function calculateProration(
  currentPlanPrice: number,
  daysRemaining: number
): number {
  const dailyRate = currentPlanPrice / PRORATION_BASE_DAYS;
  const credit = dailyRate * Math.min(daysRemaining, PRORATION_BASE_DAYS);
  return Math.round(credit);
}

/**
 * Calcula os dias restantes no ciclo atual
 */
function calculateDaysRemaining(currentPeriodEnd: number): number {
  const now = new Date();
  const periodEnd = new Date(currentPeriodEnd * 1000);
  const diffTime = periodEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Verifica se a assinatura atual tem algum desconto ativo
 */
async function checkForActiveDiscounts(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  userId: string,
  supabaseAdmin: any
): Promise<{ hasDiscount: boolean; discountType: string | null; discountDetails: string | null }> {
  
  // 1. Verificar se foi indicado e usou desconto
  const { data: referralData } = await supabaseAdmin
    .from('referrals')
    .select('id, discount_applied, discount_amount')
    .eq('referred_user_id', userId)
    .single();

  if (referralData?.discount_applied) {
    return {
      hasDiscount: true,
      discountType: 'referral',
      discountDetails: 'Desconto de indicação aplicado'
    };
  }

  // 2. Verificar cupom ativo na assinatura Stripe
  if (subscription.discount) {
    const coupon = subscription.discount.coupon;
    let discountDetails = 'Cupom ativo';
    
    if (coupon.percent_off) {
      discountDetails = `Cupom de ${coupon.percent_off}% de desconto`;
    } else if (coupon.amount_off) {
      discountDetails = `Cupom de R$ ${(coupon.amount_off / 100).toFixed(2)} de desconto`;
    }
    
    return {
      hasDiscount: true,
      discountType: 'coupon',
      discountDetails
    };
  }

  // 3. Verificar se há trial ativo
  if (subscription.trial_end && subscription.trial_end * 1000 > Date.now()) {
    return {
      hasDiscount: true,
      discountType: 'trial',
      discountDetails: 'Período de teste gratuito'
    };
  }

  // 4. Verificar invoices recentes (IGNORANDO prorrata de upgrades anteriores)
  try {
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      limit: 3, // Buscar mais invoices para análise
      status: 'paid'
    });

    if (invoices.data.length > 0) {
      // Filtrar invoices de prorrata - estas NÃO devem bloquear nova prorrata
      // Prorrata acontece quando: billing_reason === 'subscription_update' ou tem linha com proration === true
      const regularInvoices = invoices.data.filter(inv => {
        const isProrationInvoice = 
          inv.billing_reason === 'subscription_update' ||
          inv.lines?.data?.some(line => line.proration === true) ||
          inv.metadata?.type === 'proration_upgrade';
        
        if (isProrationInvoice) {
          console.log('[upgrade-subscription] ℹ️ Ignorando invoice de prorrata:', inv.id);
        }
        
        return !isProrationInvoice;
      });

      // Usar a invoice mais recente que NÃO seja prorrata
      const lastRegularInvoice = regularInvoices[0];
      
      if (lastRegularInvoice) {
        // Verificar desconto aplicado (cupom, promoção real)
        if (lastRegularInvoice.discount || lastRegularInvoice.total_discount_amounts?.length > 0) {
          // Verificar se não é desconto de prorrata
          const discountMetadata = lastRegularInvoice.discount?.coupon?.metadata;
          const isProrationDiscount = discountMetadata?.type === 'proration_credit';
          
          if (!isProrationDiscount) {
            return {
              hasDiscount: true,
              discountType: 'invoice_discount',
              discountDetails: 'Desconto aplicado na última fatura'
            };
          }
        }

        // Verificar valor promocional - mas APENAS em invoices de assinatura regular (não upgrade)
        // billing_reason 'subscription_cycle' ou 'subscription_create' indica cobrança regular
        const isRegularBilling = 
          lastRegularInvoice.billing_reason === 'subscription_cycle' || 
          lastRegularInvoice.billing_reason === 'subscription_create';
        
        if (isRegularBilling) {
          const currentPriceId = subscription.items.data[0].price.id;
          const expectedPrice = PRICE_MAP[currentPriceId]?.price || 0;
          
          if (expectedPrice > 0 && lastRegularInvoice.amount_paid < expectedPrice * 0.95) {
            return {
              hasDiscount: true,
              discountType: 'promotional',
              discountDetails: 'Valor promocional detectado na última cobrança regular'
            };
          }
        }
      }
    }
  } catch (e) {
    console.log('[upgrade-subscription] ⚠️ Não foi possível verificar invoices:', e);
  }

  // 5. Verificar metadados
  if (subscription.metadata) {
    const promoFields = ['promotion', 'promo', 'discount', 'free_months', 'referral'];
    for (const field of promoFields) {
      if (subscription.metadata[field]) {
        return {
          hasDiscount: true,
          discountType: 'metadata_promo',
          discountDetails: `Promoção ativa: ${field}`
        };
      }
    }
  }

  return { hasDiscount: false, discountType: null, discountDetails: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[upgrade-subscription] 🚀 Iniciando upgrade de assinatura...');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[upgrade-subscription] ❌ User not authenticated");
      throw new Error("Usuário não autenticado.");
    }

    console.log("[upgrade-subscription] ✅ User authenticated:", user.id);

    const { newPriceId } = await req.json();

    if (!newPriceId) {
      throw new Error("newPriceId é obrigatório.");
    }

    console.log("[upgrade-subscription] 💳 Upgrading to priceId:", newPriceId);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const newPriceInfo = PRICE_MAP[newPriceId];
    if (!newPriceInfo) {
      throw new Error(`Price ID inválido: ${newPriceId}`);
    }

    // Buscar cliente Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      throw new Error("Nenhum cliente encontrado no Stripe. Você precisa ter uma assinatura ativa.");
    }

    const customer = customers.data[0];
    console.log("[upgrade-subscription] 👤 Customer found:", customer.id);

    // Buscar assinatura ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      throw new Error("Nenhuma assinatura ativa encontrada. Use a página de checkout para assinar.");
    }

    const subscription = subscriptions.data[0];
    console.log("[upgrade-subscription] 📋 Subscription found:", subscription.id);

    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;
    const currentPriceInfo = PRICE_MAP[currentPriceId];

    if (currentPriceId === newPriceId) {
      throw new Error("Você já está neste plano.");
    }

    if (!currentPriceInfo) {
      throw new Error("Plano atual não reconhecido no sistema.");
    }

    // ============================================
    // VERIFICAR DESCONTOS ATIVOS
    // ============================================
    
    const discountCheck = await checkForActiveDiscounts(stripe, subscription, user.id, supabaseAdmin);
    
    console.log("[upgrade-subscription] 🏷️ Discount check:", discountCheck);

    // ============================================
    // CÁLCULO DE PRORRATA
    // ============================================
    
    const daysRemaining = calculateDaysRemaining(subscription.current_period_end);
    const currentPlanPrice = currentPriceInfo.price;
    const newPlanPrice = newPriceInfo.price;
    
    let creditAmount = 0;
    let finalAmount = newPlanPrice;
    let prorationApplied = false;

    // REGRA FUNDAMENTAL: Só aplicar prorrata se NÃO houver desconto
    if (discountCheck.hasDiscount) {
      creditAmount = 0;
      finalAmount = newPlanPrice;
      prorationApplied = false;
      console.log("[upgrade-subscription] ❌ NO PRORATION - discount active:", discountCheck.discountType);
    } else {
      creditAmount = calculateProration(currentPlanPrice, daysRemaining);
      finalAmount = Math.max(0, newPlanPrice - creditAmount);
      prorationApplied = true;
      console.log("[upgrade-subscription] ✅ PRORATION APPLIED:", {
        credit: creditAmount / 100,
        final: finalAmount / 100
      });
    }

    const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // ============================================
    // EXECUTAR UPGRADE NO STRIPE
    // ============================================
    
    // Cancelar schedule existente
    if (subscription.schedule) {
      try {
        await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
        console.log("[upgrade-subscription] 📅 Cancelled existing schedule");
      } catch (e) {
        console.log("[upgrade-subscription] ⚠️ Could not cancel schedule:", e);
      }
    }

    // ============================================
    // CALCULAR BILLING_CYCLE_ANCHOR BASEADO NO DIA DO MÊS
    // ============================================
    // REGRA: A renovação sempre ocorre no mesmo dia do mês em que o upgrade foi realizado
    // Se o dia não existir no mês seguinte (ex: 31), cai no último dia do mês
    
    const now = new Date();
    const billingDay = now.getDate();
    
    console.log("[upgrade-subscription] 📅 Setting billing cycle anchor to day:", billingDay);

    // Atualizar assinatura com novo billing_cycle_anchor
    // Usamos billing_cycle_anchor: 'now' para iniciar novo ciclo imediatamente
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscriptionItemId, price: newPriceId }],
      proration_behavior: 'none',
      cancel_at_period_end: false,
      billing_cycle_anchor: 'now', // Inicia novo ciclo imediatamente
    });

    console.log("[upgrade-subscription] ✅ Subscription updated to new plan with new billing cycle");
    
    // Buscar a assinatura atualizada para obter as datas corretas
    const updatedSubscription = await stripe.subscriptions.retrieve(subscription.id);
    const newPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);
    
    console.log("[upgrade-subscription] 📅 New billing cycle:", {
      start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
      end: newPeriodEnd.toISOString(),
      billingDay
    });

    // ============================================
    // COBRAR VALOR
    // ============================================
    
    let paymentUrl: string | null = null;
    let requiresPayment = false;
    let invoicePaid = false;
    let invoiceId: string | null = null;

    if (finalAmount > 0) {
      try {
        // Criar invoice item com o valor calculado
        const description = prorationApplied
          ? `Upgrade para ${newPriceInfo.displayName} - Crédito de ${formatBRL(creditAmount)} aplicado`
          : `Upgrade para ${newPriceInfo.displayName} - Sem crédito (desconto ativo no plano anterior)`;

        await stripe.invoiceItems.create({
          customer: customer.id,
          amount: finalAmount,
          currency: 'brl',
          description,
        });

        // Criar e finalizar invoice
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          auto_advance: true,
          collection_method: 'charge_automatically',
          metadata: {
            user_id: user.id,
            type: 'proration_upgrade',
            from_plan: currentPriceInfo.plan,
            to_plan: newPriceInfo.plan,
            proration_applied: prorationApplied ? 'true' : 'false',
            credit_amount: String(creditAmount),
            final_amount: String(finalAmount),
            had_discount: discountCheck.hasDiscount ? 'true' : 'false',
            discount_type: discountCheck.discountType || '',
          },
        });

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        invoiceId = finalizedInvoice.id;

        console.log("[upgrade-subscription] 📄 Invoice created:", {
          id: finalizedInvoice.id,
          status: finalizedInvoice.status,
          amount: finalizedInvoice.amount_due
        });

        if (finalizedInvoice.status === 'paid') {
          invoicePaid = true;
        } else if (finalizedInvoice.status === 'open') {
          paymentUrl = finalizedInvoice.hosted_invoice_url || null;
          requiresPayment = true;
        }
      } catch (invoiceError) {
        console.error("[upgrade-subscription] ⚠️ Invoice creation failed:", invoiceError);
      }
    } else {
      invoicePaid = true;
      console.log("[upgrade-subscription] ✅ No payment required - credit covers upgrade");
    }

    // ============================================
    // ATUALIZAR PERFIL COM NOVA DATA DE RENOVAÇÃO
    // ============================================
    
    // Buscar assinatura atualizada para obter datas corretas
    const finalSubscription = await stripe.subscriptions.retrieve(subscription.id);
    const nextBillingDate = new Date(finalSubscription.current_period_end * 1000);
    
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: newPriceInfo.plan,
        billing_interval: newPriceInfo.interval === 'yearly' ? 'yearly' : 'monthly',
        subscription_cancel_at: null,
        subscription_end_date: nextBillingDate.toISOString(),
        stripe_subscription_id: subscription.id,
      })
      .eq('user_id', user.id);

    console.log("[upgrade-subscription] ✅ Profile updated with new plan and billing date:", nextBillingDate.toISOString());

    // ============================================
    // RESPOSTA
    // ============================================
    
    let message: string;
    if (requiresPayment) {
      message = `Upgrade realizado! Complete o pagamento de ${formatBRL(finalAmount)} para ativar seu novo plano.`;
    } else if (invoicePaid && finalAmount > 0) {
      if (prorationApplied) {
        message = `Upgrade realizado com sucesso! O valor de ${formatBRL(finalAmount)} foi cobrado automaticamente. Crédito aplicado: ${formatBRL(creditAmount)}.`;
      } else {
        message = `Upgrade realizado com sucesso! O valor integral de ${formatBRL(finalAmount)} foi cobrado (sem crédito devido a desconto ativo).`;
      }
    } else if (finalAmount === 0) {
      message = `Upgrade realizado com sucesso! Seu crédito de ${formatBRL(creditAmount)} cobriu todo o valor do upgrade.`;
    } else {
      message = `Upgrade realizado com sucesso para o plano ${newPriceInfo.displayName}!`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        // Valores
        currentPlanPrice: currentPlanPrice / 100,
        newPlanPrice: newPlanPrice / 100,
        creditAmount: creditAmount / 100,
        creditFormatted: formatBRL(creditAmount),
        proratedAmount: finalAmount / 100,
        proratedAmountFormatted: formatBRL(finalAmount),
        // Prorrata
        prorationApplied,
        hadActiveDiscount: discountCheck.hasDiscount,
        discountType: discountCheck.discountType,
        // Plano
        newPlan: newPriceInfo.plan,
        newInterval: newPriceInfo.interval,
        // Pagamento
        requiresPayment,
        paymentUrl,
        invoicePaid,
        invoiceId,
        // Info
        daysRemaining,
        message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[upgrade-subscription] ❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
