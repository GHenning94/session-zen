import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

    // ✅ IMPORTANTE: Buscar TODAS as faturas do cliente (histórico completo)
    // Incluir paid + open (para faturas de proration pendentes)
    const invoiceListParams: Stripe.InvoiceListParams = {
      customer: customerId,
      limit: 100, // Aumentar limite para pegar todo o histórico
    };

    const invoices = await stripe.invoices.list(invoiceListParams);

    console.log('[get-subscription-invoices] 📃 Raw invoices count:', invoices.data.length);
    
    // Log ALL invoices for debug - mostrar tudo antes de filtrar
    invoices.data.forEach(inv => {
      console.log('[get-subscription-invoices] 📄 ALL Invoice:', {
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        billing_reason: inv.billing_reason,
        total: inv.total,
        subtotal: inv.subtotal,
        created: new Date(inv.created * 1000).toISOString()
      });
    });

    // ✅ Filtrar faturas válidas
    // Incluir: paid (pagas), open (pendentes de pagamento)
    // Excluir: draft, void, uncollectible
    // IMPORTANTE: Para proration, o valor pode estar em amount_paid ou total
    const formattedInvoices = invoices.data
      .filter(invoice => {
        // Verificar se tem algum valor (pode ser negativo para créditos)
        const hasAmount = invoice.amount_due > 0 || invoice.amount_paid > 0 || Math.abs(invoice.total || 0) > 0;
        const isValidStatus = invoice.status === 'paid' || invoice.status === 'open';
        const isNotDraft = !invoice.draft;
        
        // Log para debug
        console.log('[get-subscription-invoices] 🔍 Filtering invoice:', {
          id: invoice.id,
          number: invoice.number,
          billing_reason: invoice.billing_reason,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          total: invoice.total,
          status: invoice.status,
          hasAmount,
          isValidStatus,
          willInclude: hasAmount && isValidStatus && isNotDraft
        });
        
        return hasAmount && isValidStatus && isNotDraft;
      })
      .map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        subscription_id: invoice.subscription,
        billing_reason: invoice.billing_reason, // Adicionar billing_reason
        description: invoice.description || invoice.lines?.data?.[0]?.description || null
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
