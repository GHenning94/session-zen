import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Price map para validação
    const priceMap: Record<string, { plan: string; interval: string; price: number }> = {
      'price_1SSMNgCP57sNVd3laEmlQOcb': { plan: 'pro', interval: 'monthly', price: 2990 },
      'price_1SSMOdCP57sNVd3la4kMOinN': { plan: 'pro', interval: 'yearly', price: 29880 },
      'price_1SSMOBCP57sNVd3lqjfLY6Du': { plan: 'premium', interval: 'monthly', price: 4990 },
      'price_1SSMP7CP57sNVd3lSf4oYINX': { plan: 'premium', interval: 'yearly', price: 49896 }
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

    // Obter o item da assinatura (subscription item)
    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;

    console.log("[upgrade-subscription] 📊 Current price:", currentPriceId, "New price:", newPriceId);

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

    // Calcular valor proporcional (positivo = a cobrar, negativo = crédito)
    const proratedAmount = upcomingInvoice.amount_due;
    const proratedAmountFormatted = (proratedAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    console.log("[upgrade-subscription] 💰 Prorated amount:", proratedAmountFormatted);

    // Atualizar a assinatura com proration - always_invoice cobra imediatamente
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice', // Cobra o proration imediatamente
      payment_behavior: 'default_incomplete', // Permite criar invoice mesmo se pagamento falhar
      expand: ['latest_invoice.payment_intent'],
    });
    
    console.log("[upgrade-subscription] 📄 Latest invoice status:", (updatedSubscription.latest_invoice as Stripe.Invoice)?.status);

    console.log("[upgrade-subscription] ✅ Subscription updated:", updatedSubscription.id);

    // Verificar se precisa de pagamento adicional
    const latestInvoice = updatedSubscription.latest_invoice as Stripe.Invoice;
    let paymentUrl: string | null = null;
    let requiresPayment = false;
    let invoicePaid = false;

    console.log("[upgrade-subscription] 📄 Invoice details:", {
      id: latestInvoice?.id,
      status: latestInvoice?.status,
      amount_due: latestInvoice?.amount_due,
      amount_paid: latestInvoice?.amount_paid,
    });

    if (latestInvoice) {
      if (latestInvoice.status === 'paid') {
        // Fatura já foi paga (cobrada automaticamente do cartão em arquivo)
        invoicePaid = true;
        console.log("[upgrade-subscription] ✅ Invoice already paid:", latestInvoice.id);
      } else if (latestInvoice.status === 'open') {
        // Há uma fatura pendente que precisa ser paga
        const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
        
        console.log("[upgrade-subscription] 💳 Payment intent status:", paymentIntent?.status);
        
        if (paymentIntent && (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'requires_action')) {
          // Usar hosted_invoice_url para pagar a fatura diretamente
          if (latestInvoice.hosted_invoice_url) {
            paymentUrl = latestInvoice.hosted_invoice_url;
            requiresPayment = true;
            console.log("[upgrade-subscription] 💳 Payment required, using hosted invoice URL:", latestInvoice.id);
          } else {
            // Fallback: Criar um checkout session para pagar a fatura pendente
            const session = await stripe.checkout.sessions.create({
              customer: customer.id,
              mode: 'payment',
              line_items: [
                {
                  price_data: {
                    currency: 'brl',
                    product_data: {
                  name: `Upgrade para ${newPriceInfo.plan === 'premium' ? 'Premium' : 'Profissional'} (${newPriceInfo.interval === 'monthly' ? 'Mensal' : 'Anual'})`,
                      description: 'Valor proporcional do upgrade',
                    },
                    unit_amount: proratedAmount,
                  },
                  quantity: 1,
                },
              ],
              success_url: `${Deno.env.get("SITE_URL") || "https://therapypro.app.br"}/dashboard?payment=success&upgrade_plan=${newPriceInfo.plan}`,
              cancel_url: `${Deno.env.get("SITE_URL") || "https://therapypro.app.br"}/upgrade?upgrade=cancelled`,
              metadata: {
                user_id: user.id,
                type: 'proration_payment',
                is_proration: 'true', // Flag para webhook identificar prorrata
                subscription_id: subscription.id,
                plan_name: newPriceInfo.plan,
                billing_interval: newPriceInfo.interval,
              },
              locale: 'pt-BR',
            });
            
            paymentUrl = session.url;
            requiresPayment = true;
            console.log("[upgrade-subscription] 💳 Payment required, created checkout session:", session.id);
          }
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          invoicePaid = true;
          console.log("[upgrade-subscription] ✅ Payment already succeeded");
        }
      }
    }

    // Atualizar o perfil com o novo plano
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: newPriceInfo.plan,
        billing_interval: newPriceInfo.interval === 'yearly' ? 'yearly' : 'monthly',
        subscription_cancel_at: null, // Remove qualquer cancelamento pendente
      })
      .eq('user_id', user.id);

    console.log("[upgrade-subscription] ✅ Profile updated with new plan");

    return new Response(
      JSON.stringify({
        success: true,
        proratedAmount: proratedAmount / 100,
        proratedAmountFormatted,
        newPlan: newPriceInfo.plan,
        newInterval: newPriceInfo.interval,
        requiresPayment,
        paymentUrl,
        invoicePaid,
        invoiceId: latestInvoice?.id,
        message: requiresPayment 
          ? `Upgrade realizado! Você será redirecionado para pagar o valor proporcional de ${proratedAmountFormatted}.`
          : invoicePaid
            ? `Upgrade realizado com sucesso! O valor de ${proratedAmountFormatted} foi cobrado automaticamente.`
            : `Upgrade realizado com sucesso para o plano ${newPriceInfo.plan === 'premium' ? 'Premium' : 'Profissional'}!`
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
