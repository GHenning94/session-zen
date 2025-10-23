import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { type Request } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SendPulse removido

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autenticar utilizador (Padrão que funciona)
    const supabase = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' );
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id || !user?.email) throw new Error("User not authenticated or email not available");

    // 2. Verificar se 2FA por e-mail está ativo
    const { data: settings } = await supabase.from('user_2fa_settings').select('email_2fa_enabled').eq('user_id', user.id).single();
    if (!settings?.email_2fa_enabled) { throw new Error('Email 2FA not enabled'); }

    // --- LÓGICA DE INVALIDAÇÃO REMOVIDA ---

    // 3. Gerar e armazenar novo OTP
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    const { error: insertError } = await supabase.from('user_2fa_email_codes').insert({ user_id: user.id, code, expires_at: expiresAt.toISOString(), used: false });
    if (insertError) {
        throw new Error(`Database error storing new code: ${insertError.message}`);
    } else {
        console.log(`Successfully stored new 2FA code for user: ${user.id}`);
    }

    // --- LÓGICA DE ENVIO SENDPULSE REMOVIDA ---
    // Apenas logar o código
    console.log(`DEBUG ONLY - 2FA Code for ${user.email}: ${code}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código gerado (verifique os logs)', // Mensagem indica que não foi enviado
        // Retornar o código em desenvolvimento para facilitar testes
        code: Deno.env.get('ENVIRONMENT') === 'development' ? code : undefined 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Critical Error in 2fa-send-email-code:', error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response( JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } );
  }
});