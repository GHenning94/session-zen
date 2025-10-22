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
    // 1. Obter a ID do usuário do contexto (injetado pelo Supabase via verify_jwt: true)
    const clientContext = req.headers.get('x-supabase-client-context');
    if (!clientContext) throw new Error('Unauthorized: No client context');
    
    const context = JSON.parse(clientContext);
    const userId = context.user?.id;
    if (!userId) throw new Error('Unauthorized: No user ID in context');

    // 2. Criar o cliente Admin (Service Role)
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { enable } = await req.json();

    // 3. Usar 'upsert' (atualiza se existe, insere se não existe)
    // É mais seguro e eficiente do que 'select' e depois 'update'/'insert'
    const { error: upsertError } = await supabaseAdminClient
      .from('user_2fa_settings')
      .upsert({
        user_id: userId,
        email_2fa_enabled: enable,
      }, {
        onConflict: 'user_id' // Garante que atualize o registro existente
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