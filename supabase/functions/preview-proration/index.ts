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
 * REGRA FUNDAMENTAL:
 * A prorrata SÓ é aplicada quando o plano atual está sendo pago pelo valor CHEIO,
 * sem qualquer tipo de desconto, cupom, promoção, indicação ou mês grátis.
 * 
 * Se houver QUALQUER desconto ativo:
 * - Crédito = R$ 0,00
 * - Usuário paga 100% do novo plano
 * 
 * Quando a prorrata é válida (plano sem desconto):
 * - Crédito = (valor cheio do plano atual ÷ 30 dias) × dias restantes
 * - Base fixa de 30 dias para consistência
 * - Arredondamento para 2 casas decimais
 */

// Price map com valores em centavos (valor CHEIO, sem descontos)
const PRICE_MAP: Record<string, { plan: string; interval: string; price: number; displayName: string; cycleDays: number }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 2990, displayName: 'Profissional Mensal', cycleDays: 30 },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 29900, displayName: 'Profissional Anual', cycleDays: 365 },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 4990, displayName: 'Premium Mensal', cycleDays: 30 },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 49900, displayName: 'Premium Anual', cycleDays: 365 }
};

// Base fixa para cálculo de prorrata
const PRORATION_BASE_DAYS = 30;

/**
 * Calcula o crédito proporcional do plano atual
 * Usa base fixa de 30 dias para consistência
 */
function calculateProration(
  currentPlanPrice: number,      // Valor CHEIO do plano atual em centavos
  daysRemaining: number          // Dias restantes no ciclo
): number {
  // Para planos anuais, calcular o valor diário com base em 365 dias
  // mas manter consistência no arredondamento
  const dailyRate = currentPlanPrice / PRORATION_BASE_DAYS;
  const credit = dailyRate * Math.min(daysRemaining, PRORATION_BASE_DAYS);
  // Arredondar para centavos (2 casas decimais em reais)
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
 * Verifica se a assinatura atual tem algum desconto ativo
 */
async function checkForActiveDiscounts(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  userId: string,
  supabaseAdmin: any
): Promise<{ hasDiscount: boolean; discountType: string | null; discountDetails: string | null }> {
  
  // 1. Verificar desconto de indicação no perfil
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('professional_discount_used, is_referral_partner')
    .eq('user_id', userId)
    .single();

  // 2. Verificar se foi indicado e usou desconto
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

  // 3. Verificar cupom ativo na assinatura Stripe
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

  // 4. Verificar se há trial ativo (período grátis)
  if (subscription.trial_end && subscription.trial_end * 1000 > Date.now()) {
    return {
      hasDiscount: true,
      discountType: 'trial',
      discountDetails: 'Período de teste gratuito'
    };
  }

  // 5. Verificar invoices recentes para descontos aplicados
  try {
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      limit: 1,
      status: 'paid'
    });

    if (invoices.data.length > 0) {
      const lastInvoice = invoices.data[0];
      
      // Verificar se a invoice teve desconto
      if (lastInvoice.discount || lastInvoice.total_discount_amounts?.length > 0) {
        return {
          hasDiscount: true,
          discountType: 'invoice_discount',
          discountDetails: 'Desconto aplicado na última fatura'
        };
      }

      // Verificar se o valor pago foi menor que o esperado (indica promoção)
      const currentPriceId = subscription.items.data[0].price.id;
      const expectedPrice = PRICE_MAP[currentPriceId]?.price || 0;
      
      if (expectedPrice > 0 && lastInvoice.amount_paid < expectedPrice * 0.95) {
        // Se pagou menos de 95% do valor esperado, considera desconto
        return {
          hasDiscount: true,
          discountType: 'promotional',
          discountDetails: 'Valor promocional detectado na última fatura'
        };
      }
    }
  } catch (e) {
    console.log('[preview-proration] ⚠️ Não foi possível verificar invoices:', e);
  }

  // 6. Verificar metadados da assinatura para promoções
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
    console.log('[preview-proration] 🔍 Calculando preview de prorrata...');

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
    // VERIFICAR DESCONTOS ATIVOS
    // ============================================
    
    const discountCheck = await checkForActiveDiscounts(stripe, subscription, user.id, supabaseAdmin);
    
    console.log("[preview-proration] 🏷️ Discount check:", discountCheck);

    // ============================================
    // CÁLCULO DE PRORRATA
    // ============================================
    
    const daysRemaining = calculateDaysRemaining(subscription.current_period_end);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Determinar tipo de mudança
    const planLevels: Record<string, number> = { 'basico': 0, 'pro': 1, 'premium': 2 };
    const currentLevel = planLevels[currentPriceInfo.plan] || 0;
    const newLevel = planLevels[newPriceInfo.plan] || 0;
    const isTierChange = currentPriceInfo.plan !== newPriceInfo.plan;
    const isUpgrade = newLevel > currentLevel;
    const isDowngrade = newLevel < currentLevel;

    // Valores
    const currentPlanPrice = currentPriceInfo.price; // Valor CHEIO em centavos
    const newPlanPrice = newPriceInfo.price;
    
    let creditAmount = 0;
    let finalAmount = newPlanPrice;
    let prorationApplied = false;
    let noProrationReason: string | null = null;

    // REGRA FUNDAMENTAL: Só aplicar prorrata se NÃO houver desconto
    if (discountCheck.hasDiscount) {
      // NÃO aplicar prorrata - crédito é ZERO
      creditAmount = 0;
      finalAmount = newPlanPrice;
      prorationApplied = false;
      noProrationReason = discountCheck.discountDetails || 'Desconto ativo no plano atual';
      
      console.log("[preview-proration] ❌ NO PRORATION - discount active:", discountCheck.discountType);
    } else {
      // Aplicar prorrata normalmente
      creditAmount = calculateProration(currentPlanPrice, daysRemaining);
      finalAmount = Math.max(0, newPlanPrice - creditAmount);
      prorationApplied = true;
      
      console.log("[preview-proration] ✅ PRORATION APPLIED:", {
        currentPlanPrice: currentPlanPrice / 100,
        daysRemaining,
        creditAmount: creditAmount / 100,
        finalAmount: finalAmount / 100
      });
    }

    // Formatar valores para exibição
    const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Construir explicação
    let explanation: string;
    if (!prorationApplied) {
      explanation = `${noProrationReason}. Por isso, não há crédito proporcional. Você pagará o valor integral do ${newPriceInfo.displayName}.`;
    } else {
      explanation = `Crédito de ${formatBRL(creditAmount)} referente a ${daysRemaining} dias restantes do seu plano ${currentPriceInfo.displayName}. Você pagará ${formatBRL(finalAmount)} para ativar o ${newPriceInfo.displayName} imediatamente.`;
    }

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
      // Crédito e prorrata
      creditAmount: creditAmount / 100,
      creditFormatted: formatBRL(creditAmount),
      prorationApplied,
      noProrationReason,
      // Valor final a pagar
      proratedAmount: finalAmount / 100,
      proratedAmountFormatted: formatBRL(finalAmount),
      // Informações do ciclo
      daysRemaining,
      totalCycleDays: PRORATION_BASE_DAYS,
      periodEndDate: currentPeriodEnd.toLocaleDateString('pt-BR'),
      // Informações de desconto
      hasActiveDiscount: discountCheck.hasDiscount,
      discountType: discountCheck.discountType,
      discountDetails: discountCheck.discountDetails,
      // Explicação
      explanation
    };

    console.log("[preview-proration] ✅ Preview calculated:", {
      prorationApplied,
      credit: formatBRL(creditAmount),
      finalAmount: formatBRL(finalAmount),
      hasDiscount: discountCheck.hasDiscount
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
