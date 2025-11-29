import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDPULSE_API_ID = Deno.env.get('SENDPULSE_API_ID');
const SENDPULSE_API_SECRET = Deno.env.get('SENDPULSE_API_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPulseTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getSendPulseToken(): Promise<string> {
  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: SENDPULSE_API_ID,
      client_secret: SENDPULSE_API_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get SendPulse token');
  }

  const data: SendPulseTokenResponse = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, userName, newEmail } = await req.json();
    
    console.log('[Security Notification] Enviando notificação de segurança:', { email, type });

    if (!email || !type) {
      throw new Error('Email e tipo são obrigatórios');
    }

    let subject = '';
    let htmlContent = '';
    let textContent = '';

    const name = userName || 'Usuário';
    const currentDate = new Date().toLocaleString('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    if (type === 'password_changed') {
      subject = '🔐 Senha alterada - TherapyPro';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Senha Alterada - TherapyPro</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
            <tr>
              <td style="padding: 40px 20px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔐 Alerta de Segurança</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Olá, ${name}!</h2>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        Informamos que a senha da sua conta no <strong>TherapyPro</strong> foi alterada com sucesso.
                      </p>
                      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: bold;">Detalhes da Alteração:</p>
                        <p style="margin: 0; color: #7f1d1d; font-size: 14px;">Data e hora: ${currentDate}</p>
                      </div>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        Se você realizou esta alteração, pode ignorar este e-mail. Sua conta está segura.
                      </p>
                      <div style="background-color: #fff7ed; border: 1px solid #fb923c; border-radius: 6px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #9a3412; font-size: 14px; font-weight: bold;">⚠️ Não reconhece esta ação?</p>
                        <p style="margin: 0 0 10px 0; color: #9a3412; font-size: 14px;">
                          Se você não alterou sua senha, sua conta pode estar comprometida. Recomendamos:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #9a3412; font-size: 14px;">
                          <li>Redefinir sua senha imediatamente</li>
                          <li>Verificar atividades suspeitas na sua conta</li>
                          <li>Entrar em contato com nosso suporte</li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">© ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.</p>
                      <p style="margin: 0; color: #94a3b8; font-size: 12px;">Gestão profissional para terapeutas</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      textContent = `Olá, ${name}!\n\nInformamos que a senha da sua conta no TherapyPro foi alterada com sucesso.\n\nData e hora: ${currentDate}\n\nSe você realizou esta alteração, pode ignorar este e-mail.\n\nSe você não reconhece esta ação, recomendamos redefinir sua senha imediatamente e entrar em contato com nosso suporte.`;
    } else if (type === 'email_changed') {
      subject = '📧 E-mail alterado - TherapyPro';
      const displayNewEmail = newEmail || 'novo e-mail';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>E-mail Alterado - TherapyPro</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
            <tr>
              <td style="padding: 40px 20px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">📧 Alerta de Segurança</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Olá, ${name}!</h2>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        Informamos que o e-mail da sua conta no <strong>TherapyPro</strong> foi alterado.
                      </p>
                      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: bold;">Detalhes da Alteração:</p>
                        <p style="margin: 0 0 5px 0; color: #1e3a8a; font-size: 14px;">E-mail anterior: ${email}</p>
                        <p style="margin: 0 0 5px 0; color: #1e3a8a; font-size: 14px;">Novo e-mail: ${displayNewEmail}</p>
                        <p style="margin: 0; color: #1e3a8a; font-size: 14px;">Data e hora: ${currentDate}</p>
                      </div>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        Se você realizou esta alteração, pode ignorar este e-mail. Sua conta está segura.
                      </p>
                      <div style="background-color: #fff7ed; border: 1px solid #fb923c; border-radius: 6px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #9a3412; font-size: 14px; font-weight: bold;">⚠️ Não reconhece esta ação?</p>
                        <p style="margin: 0; color: #9a3412; font-size: 14px;">
                          Se você não alterou seu e-mail, entre em contato com nosso suporte imediatamente.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">© ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.</p>
                      <p style="margin: 0; color: #94a3b8; font-size: 12px;">Gestão profissional para terapeutas</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      textContent = `Olá, ${name}!\n\nInformamos que o e-mail da sua conta no TherapyPro foi alterado.\n\nE-mail anterior: ${email}\nNovo e-mail: ${displayNewEmail}\nData e hora: ${currentDate}\n\nSe você realizou esta alteração, pode ignorar este e-mail.\n\nSe você não reconhece esta ação, entre em contato com nosso suporte imediatamente.`;
    } else {
      throw new Error('Tipo de notificação inválido');
    }

    // Obter token do SendPulse
    const accessToken = await getSendPulseToken();

    // Enviar email via SendPulse
    const emailResponse = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: {
          html: htmlContent,
          text: textContent,
          subject: subject,
          from: {
            name: 'TherapyPro - Segurança',
            email: 'nao-responda@therapypro.app.br',
          },
          to: [
            {
              email: email,
            },
          ],
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[Security Notification] Erro ao enviar email:', errorText);
      throw new Error(`Erro ao enviar email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log('[Security Notification] Email enviado com sucesso:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Notificação de segurança enviada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Security Notification] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
