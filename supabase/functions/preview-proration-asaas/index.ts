import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preços em centavos
const PRICE_MAP: Record<string, { plan: string; interval: string; priceInCents: number; displayName: string }> = {
  'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', priceInCents: 2990, displayName: 'Profissional Mensal' },
  'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', priceInCents: 29880, displayName: 'Profissional Anual' },
  'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', priceInCents: 4990, displayName: 'Premium Mensal' },
  'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', priceInCents: 49896, displayName: 'Premium Anual' }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[preview-proration-asaas] 🔍 Calculando preview de proration para Asaas...');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[preview-proration-asaas] ❌ User not authenticated");
      throw new Error("Usuário não autenticado.");
    }

    console.log("[preview-proration-asaas] ✅ User authenticated:", user.id);

    const { newPriceId } = await req.json();

    if (!newPriceId) {
      throw new Error("newPriceId é obrigatório.");
    }

    const newPriceInfo = PRICE_MAP[newPriceId];
    if (!newPriceInfo) {
      throw new Error(`Price ID inválido: ${newPriceId}`);
    }

    console.log("[preview-proration-asaas] 💳 Preview for priceId:", newPriceId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar perfil do usuário com dados da assinatura atual
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_plan, billing_interval, subscription_end_date')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado.");
    }

    const currentPlan = profile.subscription_plan || 'basico';
    const currentInterval = profile.billing_interval || 'monthly';
    const subscriptionEndDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;

    // Determinar preço atual
    let currentPriceInfo: { plan: string; interval: string; priceInCents: number; displayName: string } | null = null;
    for (const [, info] of Object.entries(PRICE_MAP)) {
      if (info.plan === currentPlan && info.interval === currentInterval) {
        currentPriceInfo = info;
        break;
      }
    }

    if (!currentPriceInfo) {
      // Usuário no plano básico ou sem assinatura válida
      throw new Error("Você precisa ter uma assinatura paga ativa para fazer upgrade.");
    }

    // Calcular dias restantes do período atual
    const now = new Date();
    let daysRemaining = 0;
    let totalDaysInPeriod = currentInterval === 'yearly' ? 365 : 30;
    
    if (subscriptionEndDate && subscriptionEndDate > now) {
      daysRemaining = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calcular crédito proporcional do plano atual
    const dailyRateCurrent = currentPriceInfo.priceInCents / totalDaysInPeriod;
    const creditAmount = Math.round(dailyRateCurrent * daysRemaining);

    // Calcular valor proporcional do novo plano
    const totalDaysNewPeriod = newPriceInfo.interval === 'yearly' ? 365 : 30;
    const dailyRateNew = newPriceInfo.priceInCents / totalDaysNewPeriod;
    
    // Para upgrade imediato, cobrar proporcional até o fim do período atual
    const newPlanProportional = Math.round(dailyRateNew * daysRemaining);
    
    // Valor final = novo proporcional - crédito do plano atual
    const proratedAmount = Math.max(0, newPlanProportional - creditAmount);

    const proratedAmountFormatted = (proratedAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    const creditFormatted = (creditAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Verificar se é mudança de tier
    const isTierChange = currentPriceInfo.plan !== newPriceInfo.plan;

    console.log("[preview-proration-asaas] 💰 Preview calculated:", {
      currentPlan: currentPriceInfo.displayName,
      newPlan: newPriceInfo.displayName,
      daysRemaining,
      creditAmount: creditAmount / 100,
      newPlanProportional: newPlanProportional / 100,
      proratedAmount: proratedAmount / 100,
      isTierChange
    });

    return new Response(
      JSON.stringify({
        success: true,
        currentPlan: currentPriceInfo.displayName,
        currentPlanTier: currentPriceInfo.plan,
        newPlan: newPriceInfo.displayName,
        newPlanTier: newPriceInfo.plan,
        newPlanInterval: newPriceInfo.interval,
        isTierChange,
        proratedAmount: proratedAmount / 100,
        proratedAmountFormatted,
        creditAmount: creditAmount / 100,
        creditFormatted,
        daysRemaining,
        periodEndDate: subscriptionEndDate?.toLocaleDateString('pt-BR') || 'N/A',
        newPlanPrice: newPriceInfo.priceInCents / 100,
        newPlanPriceFormatted: (newPriceInfo.priceInCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        gateway: 'asaas'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[preview-proration-asaas] ❌ Error:", error);
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
