import { serve, ServerRequest } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getSendPulseToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`SendPulse Auth Error: ${data.message || 'Failed to get token'}`);
  }
  return data.access_token;
}

// --- TIPO ADICIONADO ---
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const spApiClientId = Deno.env.get('SENDPULSE_API_ID') ?? '';
    const spApiSecret = Deno.env.get('SENDPULSE_API_SECRET') ?? '';

    if (!spApiClientId || !spApiSecret) {
      throw new Error('SendPulse API credentials are not set');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace("Bearer ", "");
    
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id || !user?.email) throw new Error("User not authenticated or email not available");

    const { data: settings } = await supabase
      .from('user_2fa_settings')
      .select('email_2fa_enabled')
      .eq('user_id', user.id)
      .single();

    if (!settings?.email_2fa_enabled) {
      throw new Error('Email 2FA not enabled');
    }

    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await supabase.from('user_2fa_email_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    console.log("Authenticating with SendPulse...");
    const spAccessToken = await getSendPulseToken(spApiClientId, spApiSecret);

    console.log(`Sending 2FA Code to ${user.email} via SendPulse...`);
    
    const emailHtml = `... (HTML do e-mail inalterado) ...`; // (O HTML é o mesmo de antes)

    const sendEmailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${spAccessToken}`,
      },
      body: JSON.stringify({
        email: {
          html: emailHtml,
          text: `Seu código de login TherapyPro é: ${code}`,
          subject: `Seu código de login TherapyPro: ${code}`,
          from: {
            name: 'TherapyPro',
            email: 'nao-responda@therapypro.app.br',
          },
          to: [
            { email: user.email }
          ],
        },
      }),
    });

    if (!sendEmailResponse.ok) {
      const errorData = await sendEmailResponse.json();
      throw new Error(`SendPulse Email Error: ${errorData.message || 'Failed to send email'}`);
    }
    
    console.log(`Email sent successfully to ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado para o e-mail',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in 2fa-send-e-mail-code:', error);
    // --- TIPO ADICIONADO ---
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});