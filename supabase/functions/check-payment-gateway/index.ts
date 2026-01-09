import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Check Referral Status - Informational Endpoint
 * 
 * Este endpoint retorna informações sobre o status de indicação do usuário.
 * É usado APENAS para exibir informações na UI (ex: "Você tem desconto de indicação!").
 * 
 * ⚠️ IMPORTANTE - Arquitetura de Pagamentos:
 * 
 * 🔹 STRIPE - SEMPRE usado para checkout de assinatura
 *    - Todos os usuários pagam via Stripe (indicados ou não)
 *    - Desconto de indicação → aplicado via cupom Stripe
 *    - Comissões → calculadas no webhook Stripe
 * 
 * 🔹 ASAAS - APENAS para payout de afiliados
 *    - Stripe cobra o usuário
 *    - Sistema calcula comissão
 *    - Asaas faz PIX/TED para o afiliado
 * 
 * Este endpoint NÃO deve ser usado para roteamento de checkout!
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[check-payment-gateway] 🚀 Verificando status de indicação...');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      console.error("[check-payment-gateway] ❌ User not authenticated");
      return new Response(JSON.stringify({ 
        gateway: 'stripe', // Sempre Stripe
        isReferred: false,
        canApplyDiscount: false,
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

    // Verificar se usuário foi indicado
    const { data: referralData, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('id, status, first_payment_date, referrer_user_id, subscription_plan')
      .eq('referred_user_id', user.id)
      .single();

    if (referralError && referralError.code !== 'PGRST116') {
      console.error('[check-payment-gateway] ❌ Error checking referral:', referralError);
    }

    // Verificar se desconto já foi usado
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('professional_discount_used')
      .eq('user_id', user.id)
      .single();

    const isReferred = !!referralData;
    const hasUsedDiscount = profile?.professional_discount_used === true;
    const canApplyDiscount = isReferred && !hasUsedDiscount;

    console.log('[check-payment-gateway] 📊 Referral status:', {
      gateway: 'stripe', // Sempre Stripe para checkout
      isReferred,
      hasUsedDiscount,
      canApplyDiscount
    });
    
    // SEMPRE Stripe para checkout - Asaas é apenas para payout de afiliados
    return new Response(JSON.stringify({ 
      gateway: 'stripe', // Sempre Stripe
      isReferred,
      referralId: referralData?.id || null,
      referrerId: referralData?.referrer_user_id || null,
      hasFirstPayment: !!referralData?.first_payment_date,
      canApplyDiscount,
      reason: isReferred ? 'referred_user' : 'not_referred',
      // Info adicional para UI
      discountInfo: canApplyDiscount ? {
        percent: 20,
        description: '20% de desconto na primeira cobrança do Plano Profissional',
        appliedVia: 'stripe_coupon'
      } : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[check-payment-gateway] ❌ Error:", error);
    return new Response(JSON.stringify({ 
      gateway: 'stripe', // Sempre Stripe
      isReferred: false,
      canApplyDiscount: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});