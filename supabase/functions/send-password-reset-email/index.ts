import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDPULSE_API_ID = Deno.env.get('SENDPULSE_API_ID');
const SENDPULSE_API_SECRET = Deno.env.get('SENDPULSE_API_SECRET');
const SITE_URL = 'https://therapypro.app.br';

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
    const { email, token_hash, user_metadata } = await req.json();
    
    console.log('[SendPulse] Enviando email de redefinição de senha para:', email);

    if (!email || !token_hash) {
      throw new Error('Email e token_hash são obrigatórios');
    }

    const resetLink = `${SITE_URL}/reset-password?token_hash=${token_hash}&type=recovery`;
    const userName = user_metadata?.nome || 'Usuário';

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
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Recuperação de Senha - TherapyPro</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                }
                @media only screen and (max-width: 600px) {
                  .content {
                    padding: 30px 20px !important;
                  }
                }
              </style>
            </head>
            <body>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
                <tr>
                  <td style="padding: 40px 20px;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">TherapyPro</h1>
                        </td>
                      </tr>
                      <tr>
                        <td class="content" style="padding: 40px 30px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="word-wrap: break-word; overflow-wrap: break-word;">
                                <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Recuperação de Senha 🔑</h2>
                                <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                  Olá, ${userName}!
                                </p>
                                <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                  Recebemos uma solicitação para redefinir a senha da sua conta no <strong>TherapyPro</strong>. Clique no botão abaixo:
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                  <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Redefinir Senha</a>
                                </div>
                                <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                  Ou copie e cole este link no seu navegador:
                                </p>
                                <p style="margin: 0 0 30px 0;">
                                  <a href="${resetLink}" style="color: #2563eb; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; display: inline-block; max-width: 100%; text-decoration: underline;">${resetLink}</a>
                                </p>
                                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                  Se você não solicitou a recuperação de senha, ignore este e-mail.
                                </p>
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                  <strong>Nota:</strong> Este link expira em 1 hora por motivos de segurança.
                                </p>
                              </td>
                            </tr>
                          </table>
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
          `,
          text: `Olá, ${userName}!\n\nRecebemos uma solicitação para redefinir a senha da sua conta no TherapyPro.\n\nPara redefinir sua senha, acesse o link: ${resetLink}\n\nSe você não solicitou a redefinição, ignore este e-mail.\n\nEste link expira em 1 hora.`,
          subject: 'Redefinir Senha - TherapyPro',
          from: {
            name: 'TherapyPro',
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
      console.error('[SendPulse] Erro ao enviar email:', errorText);
      throw new Error(`Erro ao enviar email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log('[SendPulse] Email enviado com sucesso:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Email de redefinição enviado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[SendPulse] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
