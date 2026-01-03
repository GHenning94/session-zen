import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[preview-proration] 🔍 Calculando preview de proration...');

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

    // Price map para validação
    const priceMap: Record<string, { plan: string; interval: string; price: number; displayName: string }> = {
      'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 2990, displayName: 'Profissional Mensal' },
      'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 29880, displayName: 'Profissional Anual' },
      'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 4990, displayName: 'Premium Mensal' },
      'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 49896, displayName: 'Premium Anual' }
    };

    const newPriceInfo = priceMap[newPriceId];
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

    // Obter o item da assinatura e plano atual
    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;
    const currentPriceInfo = priceMap[currentPriceId];

    console.log("[preview-proration] 📊 Current price:", currentPriceId, "New price:", newPriceId);

    if (currentPriceId === newPriceId) {
      throw new Error("Você já está neste plano.");
    }

    // Calcular o valor proporcional usando proration preview
    const prorationDate = Math.floor(Date.now() / 1000);
    
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: customer.id,
      subscription: subscription.id,
      subscription_items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      subscription_proration_date: prorationDate,
    });

    // Calcular valor proporcional
    const proratedAmount = upcomingInvoice.amount_due;
    const proratedAmountFormatted = (proratedAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Calcular crédito do plano atual
    const creditAmount = upcomingInvoice.lines.data
      .filter(line => line.amount < 0)
      .reduce((sum, line) => sum + Math.abs(line.amount), 0);
    
    const creditFormatted = (creditAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Calcular dias restantes do período atual
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Verificar se é mudança de tier ou só de período
    const isTierChange = currentPriceInfo?.plan !== newPriceInfo.plan;

    console.log("[preview-proration] 💰 Preview calculated:", {
      proratedAmount: proratedAmountFormatted,
      credit: creditFormatted,
      daysRemaining,
      isTierChange,
      currentPlan: currentPriceInfo?.displayName,
      newPlan: newPriceInfo.displayName
    });

    return new Response(
      JSON.stringify({
        success: true,
        currentPlan: currentPriceInfo?.displayName || 'Plano Atual',
        currentPlanTier: currentPriceInfo?.plan || 'unknown',
        newPlan: newPriceInfo.displayName,
        newPlanTier: newPriceInfo.plan,
        newPlanInterval: newPriceInfo.interval,
        isTierChange,
        proratedAmount: proratedAmount / 100,
        proratedAmountFormatted,
        creditAmount: creditAmount / 100,
        creditFormatted,
        daysRemaining,
        periodEndDate: currentPeriodEnd.toLocaleDateString('pt-BR'),
        newPlanPrice: newPriceInfo.price / 100,
        newPlanPriceFormatted: (newPriceInfo.price / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
      }),
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
