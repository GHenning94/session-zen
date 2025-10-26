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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
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

    // Get user profile to find Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Find Stripe customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        invoices: [],
        subscription: null,
        currentPlan: profile.subscription_plan
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    let subscriptionInfo = null;
    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      subscriptionInfo = {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    }

    // Get invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 12, // Last 12 invoices
    });

    const formattedInvoices = invoices.data.map(invoice => ({
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

    return new Response(JSON.stringify({ 
      invoices: formattedInvoices,
      subscription: subscriptionInfo,
      currentPlan: profile.subscription_plan
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});