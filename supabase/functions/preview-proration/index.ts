import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * REGRAS DE PRORRATA - TherapyPro
 * 
 * Fórmula obrigatória:
 * Crédito do plano atual = (valor do plano atual ÷ total de dias do ciclo) × dias restantes
 * 
 * Valor final a pagar = preço do novo plano − crédito do plano atual
 * 
 * - A prorrata é calculada EXCLUSIVAMENTE com base no plano atual
 * - Não usar valor do plano novo para cálculo de crédito
 * - Para planos anuais: valor total anual ÷ 365 dias
 * - Para planos mensais: valor mensal ÷ 30 dias (média)
 * - Valores arredondados para centavos (2 casas decimais)
 */

// Price map com valores em centavos
const PRICE_MAP: Record<string, { plan: string; interval: string; price: number; displayName: string; cycleDays: number }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 2990, displayName: 'Profissional Mensal', cycleDays: 30 },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 29900, displayName: 'Profissional Anual', cycleDays: 365 },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 4990, displayName: 'Premium Mensal', cycleDays: 30 },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 49900, displayName: 'Premium Anual', cycleDays: 365 }
};

/**
 * Calcula o crédito proporcional do plano atual
 * Fórmula: (valor do plano atual ÷ total de dias do ciclo) × dias restantes
 */
function calculateProration(
  currentPlanPrice: number,      // Valor do plano atual em centavos
  totalCycleDays: number,        // Total de dias do ciclo (30 para mensal, 365 para anual)
  daysRemaining: number          // Dias restantes no ciclo
): number {
  const dailyRate = currentPlanPrice / totalCycleDays;
  const credit = dailyRate * daysRemaining;
  // Arredondar para centavos (evitar valores fracionados inconsistentes)
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
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[preview-proration] 🔍 Calculando preview de prorrata...');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[preview-proration] ❌ User not authenticated");
      throw new Error("Usuário não autenticado.");
    }

    console.log("[preview-proration] ✅ User authenticated:", user.id);

    const { newPriceId } = await req.json();

    if (!newPriceId) {
      throw new Error("newPriceId é obrigatório.");
    }

    console.log("[preview-proration] 💳 Preview for priceId:", newPriceId);

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
      console.error("[preview-proration] ❌ No Stripe customer found");
      throw new Error("Nenhum cliente encontrado no Stripe.");
    }

    const customer = customers.data[0];
    console.log("[preview-proration] 👤 Customer found:", customer.id);

    // Buscar assinaturas ativas do cliente
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.error("[preview-proration] ❌ No active subscription found");
      throw new Error("Nenhuma assinatura ativa encontrada.");
    }

    const subscription = subscriptions.data[0];
    console.log("[preview-proration] 📋 Subscription found:", subscription.id);

    // Obter o plano atual
    const currentPriceId = subscription.items.data[0].price.id;
    const currentPriceInfo = PRICE_MAP[currentPriceId];

    console.log("[preview-proration] 📊 Current price:", currentPriceId, "New price:", newPriceId);

    if (currentPriceId === newPriceId) {
      throw new Error("Você já está neste plano.");
    }

    if (!currentPriceInfo) {
      throw new Error("Plano atual não reconhecido no sistema.");
    }

    // ============================================
    // CÁLCULO DE PRORRATA - REGRAS PADRONIZADAS
    // ============================================
    
    // 1. Calcular dias restantes e total do ciclo
    const daysRemaining = calculateDaysRemaining(subscription.current_period_end);
    const totalCycleDays = calculateTotalCycleDays(
      subscription.current_period_start,
      subscription.current_period_end
    );

    console.log("[preview-proration] 📅 Cycle info:", {
      totalCycleDays,
      daysRemaining,
      periodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      periodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });

    // 2. Calcular crédito do plano ATUAL (usando valor real pago pelo usuário)
    // Importante: usar o preço REAL do plano atual, não o do novo plano
    const currentPlanPrice = currentPriceInfo.price; // Valor em centavos
    
    const creditAmount = calculateProration(
      currentPlanPrice,
      totalCycleDays,
      daysRemaining
    );

    console.log("[preview-proration] 💰 Credit calculation:", {
      currentPlanPrice: currentPlanPrice / 100,
      totalCycleDays,
      daysRemaining,
      creditAmount: creditAmount / 100
    });

    // 3. Calcular valor final a pagar
    // Valor final = preço do novo plano − crédito do plano atual
    const newPlanPrice = newPriceInfo.price;
    let finalAmount = newPlanPrice - creditAmount;
    
    // Se o crédito for maior que o novo plano (downgrade), não há valor a pagar
    // O crédito excedente seria mantido internamente ou descartado (conforme regra)
    if (finalAmount < 0) {
      finalAmount = 0;
    }

    console.log("[preview-proration] 💵 Final calculation:", {
      newPlanPrice: newPlanPrice / 100,
      creditAmount: creditAmount / 100,
      finalAmount: finalAmount / 100
    });

    // 4. Determinar se é upgrade ou downgrade
    const planLevels: Record<string, number> = { 'basico': 0, 'pro': 1, 'premium': 2 };
    const currentLevel = planLevels[currentPriceInfo.plan] || 0;
    const newLevel = planLevels[newPriceInfo.plan] || 0;
    const isTierChange = currentPriceInfo.plan !== newPriceInfo.plan;
    const isUpgrade = newLevel > currentLevel;
    const isDowngrade = newLevel < currentLevel;

    // 5. Formatar valores para exibição
    const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    const response = {
      success: true,
      // Informações dos planos
      currentPlan: currentPriceInfo.displayName,
      currentPlanTier: currentPriceInfo.plan,
      currentPlanInterval: currentPriceInfo.interval,
      newPlan: newPriceInfo.displayName,
      newPlanTier: newPriceInfo.plan,
      newPlanInterval: newPriceInfo.interval,
      // Tipo de mudança
      isTierChange,
      isUpgrade,
      isDowngrade,
      // Valores calculados (em reais)
      currentPlanPrice: currentPlanPrice / 100,
      currentPlanPriceFormatted: formatBRL(currentPlanPrice),
      newPlanPrice: newPlanPrice / 100,
      newPlanPriceFormatted: formatBRL(newPlanPrice),
      creditAmount: creditAmount / 100,
      creditFormatted: formatBRL(creditAmount),
      // Valor final a pagar (somente para upgrades)
      proratedAmount: finalAmount / 100,
      proratedAmountFormatted: formatBRL(finalAmount),
      // Informações do ciclo
      daysRemaining,
      totalCycleDays,
      periodEndDate: currentPeriodEnd.toLocaleDateString('pt-BR'),
      // Mensagem explicativa
      explanation: isUpgrade
        ? `Crédito de ${formatBRL(creditAmount)} referente a ${daysRemaining} dias restantes do seu plano ${currentPriceInfo.displayName}. Você pagará ${formatBRL(finalAmount)} para ativar o ${newPriceInfo.displayName} imediatamente.`
        : `Seu plano ${currentPriceInfo.displayName} continuará ativo até ${currentPeriodEnd.toLocaleDateString('pt-BR')}. Após essa data, você será movido para o ${newPriceInfo.displayName}.`
    };

    console.log("[preview-proration] ✅ Preview calculated:", {
      credit: formatBRL(creditAmount),
      finalAmount: formatBRL(finalAmount),
      daysRemaining,
      isUpgrade
    });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[preview-proration] ❌ Error:", error);
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
