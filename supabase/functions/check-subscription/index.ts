import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Removido o Stripe, não precisamos mais dele aqui
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION-FAST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // --- INÍCIO DA LÓGICA RÁPIDA ---

    // Use a chave de serviço para ler o banco de dados
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // 1. Busque o perfil/assinatura do usuário DIRETAMENTE do seu banco de dados
    // (Assumindo que você tem uma tabela 'profiles' ou 'subscriptions')
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles') // <-- MUDE AQUI se sua tabela for 'subscriptions'
      .select('subscription_tier, subscription_end') // <-- MUDE AQUI os nomes das colunas
      .eq('user_id', user.id) // <-- MUDE AQUI se a coluna for 'id'
      .single();

    if (profileError || !profileData) {
      logStep("No profile/subscription found in DB, defaulting to basic", { error: profileError?.message });
      // Se não achar, retorna basico (nunca deve acontecer se o webhook funcionar)
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: "basico",
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found subscription info in DB", profileData);
    
    const tier = profileData.subscription_tier || "basico";
    const subEnd = profileData.subscription_end || null;
    const isSubscribed = tier !== "basico" && subEnd && new Date(subEnd) > new Date();

    // 2. Retorne a informação do banco de dados (SUPER RÁPIDO)
    return new Response(JSON.stringify({
      subscribed: isSubscribed,
      subscription_tier: tier,
      subscription_end: subEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    // --- FIM DA LÓGICA RÁPIDA ---

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});