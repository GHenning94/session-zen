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
 * Fórmula obrigatória:
 * Crédito do plano atual = (valor do plano atual ÷ total de dias do ciclo) × dias restantes
 * Valor final a pagar = preço do novo plano − crédito do plano atual
 * 
 * - A prorrata é calculada EXCLUSIVAMENTE com base no plano atual
 * - Não usar valor do plano novo para cálculo de crédito
 * - Valores arredondados para centavos (2 casas decimais)
 */

// Price map com valores em centavos
const PRICE_MAP: Record<string, { plan: string; interval: string; price: number; displayName: string }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 2990, displayName: 'Profissional Mensal' },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 29900, displayName: 'Profissional Anual' },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 4990, displayName: 'Premium Mensal' },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 49900, displayName: 'Premium Anual' }
};

/**
 * Calcula o crédito proporcional do plano atual
 */
function calculateProration(
  currentPlanPrice: number,
  totalCycleDays: number,
  daysRemaining: number
): number {
  const dailyRate = currentPlanPrice / totalCycleDays;
  const credit = dailyRate * daysRemaining;
  return Math.round(credit);
}

/**
 * Calcula os dias restantes no ciclo atual
 */
function calculateDaysRemaining(currentPeriodEnd: number): number {
  const now = new Date();
  const periodEnd = new Date(currentPeriodEnd * 1000);
  const diffTime = periodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calcula o total de dias do ciclo atual
 */
function calculateTotalCycleDays(currentPeriodStart: number, currentPeriodEnd: number): number {
  const start = new Date(currentPeriodStart * 1000);
  const end = new Date(currentPeriodEnd * 1000);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

    // Buscar cliente Stripe pelo email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.error("[upgrade-subscription] ❌ No Stripe customer found");
      throw new Error("Nenhum cliente encontrado no Stripe. Você precisa ter uma assinatura ativa.");
    }

    const customer = customers.data[0];
    console.log("[upgrade-subscription] 👤 Customer found:", customer.id);

    // Buscar assinaturas ativas do cliente
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.error("[upgrade-subscription] ❌ No active subscription found");
      throw new Error("Nenhuma assinatura ativa encontrada. Use a página de checkout para assinar.");
    }

    const subscription = subscriptions.data[0];
    console.log("[upgrade-subscription] 📋 Subscription found:", subscription.id);

    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;
    const currentPriceInfo = PRICE_MAP[currentPriceId];

    console.log("[upgrade-subscription] 📊 Current price:", currentPriceId, "New price:", newPriceId);

    if (currentPriceId === newPriceId) {
      throw new Error("Você já está neste plano.");
    }

    if (!currentPriceInfo) {
      throw new Error("Plano atual não reconhecido no sistema.");
    }

    // ============================================
    // CÁLCULO DE PRORRATA MANUAL - REGRAS PADRONIZADAS
    // ============================================
    
    const daysRemaining = calculateDaysRemaining(subscription.current_period_end);
    const totalCycleDays = calculateTotalCycleDays(
      subscription.current_period_start,
      subscription.current_period_end
    );

    // Crédito baseado APENAS no plano atual
    const currentPlanPrice = currentPriceInfo.price;
    const creditAmount = calculateProration(currentPlanPrice, totalCycleDays, daysRemaining);
    
    // Valor final = novo plano - crédito do plano atual
    const newPlanPrice = newPriceInfo.price;
    let finalAmount = newPlanPrice - creditAmount;
    if (finalAmount < 0) finalAmount = 0;

    console.log("[upgrade-subscription] 💰 Proration calculation:", {
      currentPlanPrice: currentPlanPrice / 100,
      newPlanPrice: newPlanPrice / 100,
      creditAmount: creditAmount / 100,
      finalAmount: finalAmount / 100,
      daysRemaining,
      totalCycleDays
    });

    const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // ============================================
    // EXECUTAR UPGRADE NO STRIPE
    // ============================================
    
    // Cancelar qualquer schedule existente antes do upgrade
    if (subscription.schedule) {
      try {
        await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
        console.log("[upgrade-subscription] 📅 Cancelled existing schedule");
      } catch (e) {
        console.log("[upgrade-subscription] ⚠️ Could not cancel schedule:", e);
      }
    }

    // Usar proration_behavior: 'none' para evitar cálculo automático do Stripe
    // Em vez disso, vamos criar uma invoice separada com o valor exato
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: 'none', // Não usar prorrata automática do Stripe
      cancel_at_period_end: false,
    });

    console.log("[upgrade-subscription] ✅ Subscription updated to new plan");

    // ============================================
    // COBRAR VALOR PROPORCIONAL (SE HOUVER)
    // ============================================
    
    let paymentUrl: string | null = null;
    let requiresPayment = false;
    let invoicePaid = false;
    let invoiceId: string | null = null;

    if (finalAmount > 0) {
      // Criar invoice separada com o valor exato calculado
      try {
        // Criar um invoice item para cobrar o valor proporcional
        await stripe.invoiceItems.create({
          customer: customer.id,
          amount: finalAmount,
          currency: 'brl',
          description: `Upgrade para ${newPriceInfo.displayName} - Crédito de ${formatBRL(creditAmount)} aplicado`,
        });

        // Criar e finalizar a invoice
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          auto_advance: true, // Tenta cobrar automaticamente
          collection_method: 'charge_automatically',
          metadata: {
            user_id: user.id,
            type: 'proration_upgrade',
            from_plan: currentPriceInfo.plan,
            to_plan: newPriceInfo.plan,
            credit_amount: String(creditAmount),
            final_amount: String(finalAmount),
          },
        });

        // Finalizar a invoice para tentar cobrar
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        invoiceId = finalizedInvoice.id;

        console.log("[upgrade-subscription] 📄 Invoice created:", {
          id: finalizedInvoice.id,
          status: finalizedInvoice.status,
          amount_due: finalizedInvoice.amount_due
        });

        // Verificar se foi paga automaticamente
        if (finalizedInvoice.status === 'paid') {
          invoicePaid = true;
          console.log("[upgrade-subscription] ✅ Invoice paid automatically");
        } else if (finalizedInvoice.status === 'open') {
          // Precisa de pagamento manual
          paymentUrl = finalizedInvoice.hosted_invoice_url || null;
          requiresPayment = true;
          console.log("[upgrade-subscription] 💳 Payment required:", paymentUrl);
        }
      } catch (invoiceError) {
        console.error("[upgrade-subscription] ⚠️ Invoice creation failed:", invoiceError);
        // Continuar mesmo se a invoice falhar - o upgrade já foi feito
      }
    } else {
      // Não há valor a pagar (crédito cobre todo o upgrade)
      invoicePaid = true;
      console.log("[upgrade-subscription] ✅ No payment required - credit covers upgrade");
    }

    // ============================================
    // ATUALIZAR PERFIL NO SUPABASE
    // ============================================
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: newPriceInfo.plan,
        billing_interval: newPriceInfo.interval === 'yearly' ? 'yearly' : 'monthly',
        subscription_cancel_at: null,
      })
      .eq('user_id', user.id);

    console.log("[upgrade-subscription] ✅ Profile updated with new plan");

    // ============================================
    // RESPOSTA FINAL
    // ============================================
    
    const response = {
      success: true,
      // Valores calculados
      currentPlanPrice: currentPlanPrice / 100,
      newPlanPrice: newPlanPrice / 100,
      creditAmount: creditAmount / 100,
      creditFormatted: formatBRL(creditAmount),
      proratedAmount: finalAmount / 100,
      proratedAmountFormatted: formatBRL(finalAmount),
      // Novo plano
      newPlan: newPriceInfo.plan,
      newInterval: newPriceInfo.interval,
      // Status do pagamento
      requiresPayment,
      paymentUrl,
      invoicePaid,
      invoiceId,
      // Informações adicionais
      daysRemaining,
      totalCycleDays,
      message: requiresPayment 
        ? `Upgrade realizado! Complete o pagamento de ${formatBRL(finalAmount)} para ativar seu novo plano.`
        : invoicePaid && finalAmount > 0
          ? `Upgrade realizado com sucesso! O valor de ${formatBRL(finalAmount)} foi cobrado automaticamente. Crédito aplicado: ${formatBRL(creditAmount)}.`
          : finalAmount === 0
            ? `Upgrade realizado com sucesso! Seu crédito de ${formatBRL(creditAmount)} cobriu todo o valor do upgrade.`
            : `Upgrade realizado com sucesso para o plano ${newPriceInfo.displayName}!`
    };

    return new Response(
      JSON.stringify(response),
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
