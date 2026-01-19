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

    // Usar service role para buscar usuário por email
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Receber email do body (versão pública - não depende de JWT)
    const { email } = await req.json();
    
    if (!email) {
      throw new Error('Email é obrigatório');
    }

    console.log(`[twofa-send-email-code-public] Processing request for email: ${email}`);

    // Buscar usuário por email usando admin API
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error('Erro ao buscar usuário');
    }

    // Buscar o usuário específico por email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      throw new Error('Erro ao buscar usuário');
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`[twofa-send-email-code-public] User not found for email: ${email}`);
      // Retornar sucesso mesmo se usuário não existe (segurança)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Se o e-mail estiver cadastrado, o código será enviado',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[twofa-send-email-code-public] User found: ${user.id}`);

    // Verificar se 2FA por email está habilitado
    const { data: settings } = await supabase
      .from('user_2fa_settings')
      .select('email_2fa_enabled')
      .eq('user_id', user.id)
      .single();

    if (!settings?.email_2fa_enabled) {
      console.log(`[twofa-send-email-code-public] Email 2FA not enabled for user: ${user.id}`);
      throw new Error('2FA por e-mail não está habilitado para este usuário');
    }

    // Invalidar todos os códigos de e-mail anteriores e não utilizados para este usuário
    console.log(`[twofa-send-email-code-public] Invalidating old email codes for user: ${user.id}`);
    const { error: updateError } = await supabase
      .from('user_2fa_email_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    if (updateError) {
      console.error('Error invalidating old codes:', updateError);
      // Continuamos mesmo se isto falhar
    }

    // Gerar e armazenar novo OTP
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error: insertError } = await supabase.from('user_2fa_email_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (insertError) {
      console.error('Error inserting new code:', insertError);
      throw new Error('Erro ao gerar código');
    }

    console.log(`[twofa-send-email-code-public] New code generated for user: ${user.id}`);

    // Enviar email via SendPulse
    console.log("[twofa-send-email-code-public] Authenticating with SendPulse...");
    const spAccessToken = await getSendPulseToken(spApiClientId, spApiSecret);

    console.log(`[twofa-send-email-code-public] Sending 2FA Code to ${email} via SendPulse...`);
    
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
            { email: email }
          ],
        },
      }),
    });

    if (!sendEmailResponse.ok) {
      const errorData = await sendEmailResponse.json();
      console.error('SendPulse error:', errorData);
      throw new Error(`Erro ao enviar e-mail: ${errorData.message || 'Failed to send email'}`);
    }
    
    console.log(`[twofa-send-email-code-public] Email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado para o e-mail',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[twofa-send-email-code-public] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar código';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
