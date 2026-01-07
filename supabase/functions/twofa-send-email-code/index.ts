import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

serve(async (req) => {
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

    // --- INÍCIO DA CORREÇÃO ---
    // 1. Invalidar todos os códigos de e-mail anteriores e não utilizados para este usuário
    console.log(`Invalidating old email codes for user: ${user.id}`);
    const { error: updateError } = await supabase
      .from('user_2fa_email_codes')
      .update({ used: true }) // Marca como usado
      .eq('user_id', user.id)
      .eq('used', false); // Apenas os que ainda não foram usados

    if (updateError) {
      console.error('Error invalidating old codes:', updateError);
      // Continuamos mesmo se isto falhar, o novo código irá funcionar
    }
    // --- FIM DA CORREÇÃO ---

    // 2. Gerar e armazenar novo OTP
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
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Olá,</h2>
        <p>Seu código de verificação de dois fatores é:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
        <p>Este código expira em 10 minutos.</p>
        <p>Se você não solicitou este código, pode ignorar este e-mail com segurança.</p>
        <p>Atenciosamente,<br>Equipe TherapyPro</p>
      </div>
    `;

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
    console.error('Error in 2fa-send-email-code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar código';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});