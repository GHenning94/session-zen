import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const SENDPULSE_API_ID = Deno.env.get('SENDPULSE_API_ID');
const SENDPULSE_API_SECRET = Deno.env.get('SENDPULSE_API_SECRET');
// Use a URL do frontend da requisição ou fallback para o domínio de produção
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
    headers: { 'Content-Type': 'application/json' },
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, user_metadata } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[Password Reset] Iniciando para:', email);

    // Supabase Admin client (service role)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Gera o link de recuperação
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    if (linkError || !linkData) {
      console.error('[Password Reset] Erro ao gerar link:', linkError);
      throw new Error(linkError?.message || 'Falha ao gerar link de recuperação');
    }

    // Extrai o token_hash (pode estar em properties.hashed_token ou diretamente em hashed_token)
    let tokenHash: string | null = null;
    
    // Tentar primeiro em properties.hashed_token
    if ((linkData as any).properties?.hashed_token) {
      tokenHash = (linkData as any).properties.hashed_token;
    } 
    // Fallback para hashed_token direto
    else if ((linkData as any).hashed_token) {
      tokenHash = (linkData as any).hashed_token;
    }
    // Fallback para extrair do action_link
    else if ((linkData as any).action_link) {
      try {
        const u = new URL((linkData as any).action_link);
        tokenHash = u.searchParams.get('token');
      } catch (_) {
        // ignore
      }
    }

    if (!tokenHash) {
      console.error('[Password Reset] Token não encontrado no retorno:', JSON.stringify(linkData, null, 2));
      throw new Error('Token de recuperação não encontrado');
    }
    
    console.log('[Password Reset] Token extraído com sucesso');

    const resetLink = `${SITE_URL}/reset-password?token_hash=${tokenHash}&type=recovery`;
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
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
                  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                  .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; }
                  .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
                  .content { padding: 30px; word-wrap: break-word; overflow-wrap: break-word; }
                  .content p { color: #333333; line-height: 1.6; margin: 15px 0; word-wrap: break-word; }
                  .button-container { text-align: center; margin: 30px 0; }
                  .button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
                  .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 12px; }
                  .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                  @media only screen and (max-width: 600px) {
                    .content { padding: 20px; }
                    .button { padding: 12px 30px; font-size: 14px; }
                  }
                </style>
              </head>
              <body>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout: fixed;">
                  <tr>
                    <td>
                      <div class="container">
                        <div class="header">
                          <h1>TherapyPro 🔐</h1>
                        </div>
                        <div class="content">
                          <p>Olá, <strong>${userName || 'Usuário'}</strong>! 🔐</p>
                          <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>TherapyPro</strong>.</p>
                          <p>Clique no botão abaixo para criar uma nova senha:</p>
                          <div class="button-container">
                            <a href="${resetLink}" class="button">Redefinir Senha</a>
                          </div>
                          <div class="warning">
                            <p style="margin: 0;"><strong>⚠️ Importante:</strong></p>
                            <p style="margin: 5px 0 0 0;">Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá segura.</p>
                          </div>
                          <p style="font-size: 14px; color: #666;">Este link expira em <strong>1 hora</strong> por segurança.</p>
                        </div>
                        <div class="footer">
                          <p>&copy; ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.</p>
                        </div>
                      </div>
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
          to: [ { email } ],
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[SendPulse] Erro ao enviar email:', errorText);
      throw new Error(`Erro ao enviar email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log('[Password Reset] Email enviado com sucesso via SendPulse:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail de recuperação enviado via SendPulse' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Password Reset] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});