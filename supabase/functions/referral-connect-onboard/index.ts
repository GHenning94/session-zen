import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[referral-connect-onboard] ${step}`, details ? JSON.stringify(details) : '');
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Verificar se já tem conta Connect
    const { data: existingAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      stripeAccountId = existingAccount.stripe_account_id;
      logStep("Using existing Connect account", { stripeAccountId });
    } else {
      // Buscar dados do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, telefone')
        .eq('user_id', user.id)
        .single();

      // Criar conta Express no Stripe Connect
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: profile?.nome || 'Parceiro TherapyPro',
          product_description: 'Comissões do programa de indicação TherapyPro',
        },
        metadata: {
          user_id: user.id,
          platform: 'therapypro',
        },
      });

      stripeAccountId = account.id;
      logStep("Created new Connect account", { stripeAccountId });

      // Salvar no banco
      await supabase
        .from('stripe_connect_accounts')
        .insert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          account_status: 'pending',
        });
    }

    // Criar link de onboarding
    const { body } = await req.json().catch(() => ({ body: {} }));
    const returnUrl = body?.return_url || 'https://therapypro.app/programa-indicacao';
    const refreshUrl = body?.refresh_url || 'https://therapypro.app/programa-indicacao?refresh=true';

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    logStep("Created onboarding link", { url: accountLink.url });

    return new Response(JSON.stringify({
      success: true,
      onboarding_url: accountLink.url,
      stripe_account_id: stripeAccountId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[referral-connect-onboard] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
