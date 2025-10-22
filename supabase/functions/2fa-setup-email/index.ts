import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Criar UM cliente admin (Service Role), tal como no check-subscription
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Obter o cabeçalho de autorização, tal como no check-subscription
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // 3. Obter o token, tal como no check-subscription
    const token = authHeader.replace("Bearer ", "");
    
    // 4. Obter o utilizador a partir do token, tal como no check-subscription
    const { data: userData, error: userError } = await supabaseAdminClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");


    // Agora o resto da lógica (que está correta)
    const { enable } = await req.json();

    const { error: upsertError } = await supabaseAdminClient
      .from('user_2fa_settings')
      .upsert({
        user_id: user.id,
        email_2fa_enabled: enable,
      }, {
        onConflict: 'user_id' // Garante que atualize o registo existente
      });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, message: `2FA por e-mail ${enable ? 'ativado' : 'desativado'} com sucesso` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in 2fa-setup-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});