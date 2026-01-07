import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[referral-connect-status] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) throw new Error("Authentication failed");
    logStep("User authenticated", { userId: user.id });

    // Buscar conta Connect
    const { data: connectAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!connectAccount) {
      return new Response(JSON.stringify({
        has_account: false,
        account_status: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Buscar status atualizado do Stripe
    const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);
    logStep("Retrieved Stripe account", { 
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });

    // Determinar status
    let accountStatus = 'pending';
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      accountStatus = 'active';
    } else if (account.details_submitted) {
      accountStatus = 'restricted';
    }

    // Atualizar no banco se mudou
    if (
      connectAccount.account_status !== accountStatus ||
      connectAccount.charges_enabled !== account.charges_enabled ||
      connectAccount.payouts_enabled !== account.payouts_enabled ||
      connectAccount.details_submitted !== account.details_submitted
    ) {
      await supabase
        .from('stripe_connect_accounts')
        .update({
          account_status: accountStatus,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          details_submitted: account.details_submitted || false,
        })
        .eq('user_id', user.id);
      
      logStep("Updated account status", { accountStatus });
    }

    return new Response(JSON.stringify({
      has_account: true,
      stripe_account_id: connectAccount.stripe_account_id,
      account_status: accountStatus,
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
      details_submitted: account.details_submitted || false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[referral-connect-status] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
