import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Smart Gateway Router - Determina qual gateway de pagamento usar
 * 
 * Regras:
 * - Usuários indicados (com referral ativo) → Asaas
 * - Usuários não indicados → Stripe
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[check-payment-gateway] 🚀 Verificando gateway...');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[check-payment-gateway] ❌ User not authenticated");
      return new Response(JSON.stringify({ 
        gateway: 'stripe',
        isReferred: false,
        reason: 'not_authenticated'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("[check-payment-gateway] ✅ User authenticated:", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar se usuário foi indicado (existe como referred_user_id na tabela referrals)
    const { data: referralData, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('id, status, first_payment_date, referrer_user_id, subscription_plan')
      .eq('referred_user_id', user.id)
      .single();

    if (referralError && referralError.code !== 'PGRST116') {
      console.error('[check-payment-gateway] ❌ Error checking referral:', referralError);
    }

    // Verificar se o Asaas está configurado
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasConfigured = !!asaasApiKey;

    if (!asaasConfigured) {
      console.log('[check-payment-gateway] ⚠️ Asaas not configured, using Stripe');
      return new Response(JSON.stringify({ 
        gateway: 'stripe',
        isReferred: !!referralData,
        reason: 'asaas_not_configured'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se usuário foi indicado → Asaas
    if (referralData) {
      const isActiveReferral = ['pending', 'converted'].includes(referralData.status);
      const hasNotPaidYet = !referralData.first_payment_date;
      
      // Somente usar Asaas se:
      // 1. Referral está ativo
      // 2. Usuário ainda não pagou (primeiro pagamento)
      // OU se já pagou mas continua com assinatura ativa via Asaas
      const useAsaas = isActiveReferral;

      console.log('[check-payment-gateway] 🎯 Referral found:', {
        referralId: referralData.id,
        status: referralData.status,
        firstPayment: referralData.first_payment_date,
        isActiveReferral,
        hasNotPaidYet,
        useAsaas
      });

      if (useAsaas) {
        return new Response(JSON.stringify({ 
          gateway: 'asaas',
          isReferred: true,
          referralId: referralData.id,
          referrerId: referralData.referrer_user_id,
          hasFirstPayment: !!referralData.first_payment_date,
          canApplyDiscount: hasNotPaidYet,
          reason: 'referred_user'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Usuário não indicado ou referral inativo → Stripe
    console.log('[check-payment-gateway] 💳 Using Stripe (default)');
    
    return new Response(JSON.stringify({ 
      gateway: 'stripe',
      isReferred: false,
      reason: 'not_referred'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[check-payment-gateway] ❌ Error:", error);
    // Em caso de erro, usar Stripe como fallback
    return new Response(JSON.stringify({ 
      gateway: 'stripe',
      isReferred: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
