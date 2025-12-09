import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.log('[get-subscription-invoices] ⚠️ No STRIPE_SECRET_KEY configured');
      return new Response(JSON.stringify({ 
        invoices: [],
        subscription: null,
        currentPlan: 'basico'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[get-subscription-invoices] 📋 Fetching invoices for user:', user.id);

    // Get user profile to find Stripe customer and subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, stripe_customer_id, stripe_subscription_id, billing_interval')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Se não tem customer_id, buscar por email
    let customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length === 0) {
        console.log('[get-subscription-invoices] ℹ️ No Stripe customer found');
        return new Response(JSON.stringify({ 
          invoices: [],
          subscription: null,
          currentPlan: profile.subscription_plan || 'basico'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      customerId = customers.data[0].id;
    }

    console.log('[get-subscription-invoices] 👤 Customer ID:', customerId);

    // Get active subscription
    let subscriptionInfo = null;
    let subscriptionId = profile.stripe_subscription_id;

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription && (subscription.status === 'active' || subscription.status === 'canceled')) {
          subscriptionInfo = {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            current_period_start: subscription.current_period_start,
            cancel_at_period_end: subscription.cancel_at_period_end,
          };
        }
      } catch (subErr) {
        console.log('[get-subscription-invoices] ⚠️ Could not retrieve subscription:', subErr);
      }
    }

    // Se não encontrou pelo ID, buscar pela lista
    if (!subscriptionInfo) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        subscriptionInfo = {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          current_period_start: subscription.current_period_start,
          cancel_at_period_end: subscription.cancel_at_period_end,
        };
        subscriptionId = subscription.id;
      }
    }

    console.log('[get-subscription-invoices] 📅 Subscription info:', subscriptionInfo);

    // ✅ IMPORTANTE: Buscar apenas faturas PAGAS da assinatura atual
    // Isso evita mostrar faturas de teste ou de assinaturas antigas
    const invoiceListParams: Stripe.InvoiceListParams = {
      customer: customerId,
      limit: 12,
      status: 'paid'
    };

    // Se temos uma assinatura, filtrar apenas faturas dessa assinatura
    if (subscriptionId) {
      invoiceListParams.subscription = subscriptionId;
    }

    const invoices = await stripe.invoices.list(invoiceListParams);

    console.log('[get-subscription-invoices] 📃 Raw invoices count:', invoices.data.length);

    // ✅ Filtrar apenas faturas reais com valores pagos
    // Excluir faturas de $0 (prorated credits, trials, etc)
    const formattedInvoices = invoices.data
      .filter(invoice => {
        const hasAmount = invoice.amount_paid > 0;
        const isPaid = invoice.status === 'paid';
        const isNotDraft = !invoice.draft;
        
        // Log para debug
        if (!hasAmount || !isPaid) {
          console.log('[get-subscription-invoices] ⏭️ Skipping invoice:', {
            id: invoice.id,
            number: invoice.number,
            amount_paid: invoice.amount_paid,
            status: invoice.status,
            reason: !hasAmount ? 'zero amount' : 'not paid'
          });
        }
        
        return hasAmount && isPaid && isNotDraft;
      })
      .map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
      }));

    console.log('[get-subscription-invoices] ✅ Filtered invoices count:', formattedInvoices.length);

    return new Response(JSON.stringify({ 
      invoices: formattedInvoices,
      subscription: subscriptionInfo,
      currentPlan: profile.subscription_plan || 'basico'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[get-subscription-invoices] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
