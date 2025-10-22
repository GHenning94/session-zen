import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Criar o cliente Admin (Service Role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 2. Obter o cabeçalho de autorização, tal como no check-subscription
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // 3. Obter o token, tal como no check-subscription
    const token = authHeader.replace("Bearer ", "");
    
    // 4. Obter o utilizador a partir do token, tal como no check-subscription
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id || !user?.email) throw new Error("User not authenticated or email not available");

    // 5. Check if email 2FA is enabled
    // (Esta lógica é do seu arquivo original, mas agora usa o user.id seguro)
    const { data: settings } = await supabase
      .from('user_2fa_settings')
      .select('email_2fa_enabled')
      .eq('user_id', user.id)
      .single();

    if (!settings?.email_2fa_enabled) {
      throw new Error('Email 2FA not enabled');
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store OTP
    await supabase.from('user_2fa_email_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    // TODO: Send email with code (integrate with Resend if available)
    console.log(`2FA Code for ${user.email}: ${code}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado para o e-mail',
        // Only for development - remove in production
        code: Deno.env.get('ENVIRONMENT') === 'development' ? code : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in 2fa-send-email-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});