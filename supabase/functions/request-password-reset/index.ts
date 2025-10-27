import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const SENDPULSE_API_ID = Deno.env.get('SENDPULSE_API_ID');
const SENDPULSE_API_SECRET = Deno.env.get('SENDPULSE_API_SECRET');
const SITE_URL = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://therapypro.lovable.app';

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

    // Extrai o token_hash
    let tokenHash: string | null = (linkData as any).hashed_token || null;
    if (!tokenHash && (linkData as any).action_link) {
      try {
        const u = new URL((linkData as any).action_link);
        tokenHash = u.searchParams.get('token_hash');
      } catch (_) {
        // ignore
      }
    }

    if (!tokenHash) {
      console.error('[Password Reset] hashed_token ausente no retorno:', linkData);
      throw new Error('Token de recuperação não encontrado');
    }

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
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Redefinir Senha - TherapyPro</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">TherapyPro</h1>
                        </td>
                      </tr>
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Olá, ${userName}! 🔐</h2>
                          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            Recebemos uma solicitação para redefinir a senha da sua conta no <strong>TherapyPro</strong>.
                          </p>
                          <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            Se você fez essa solicitação, clique no botão abaixo para criar uma nova senha:
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="padding: 20px 0;">
                                <a href="${resetLink}" 
                                   style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                  Redefinir Senha
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            <strong>⚠️ Importante:</strong> Se você não solicitou a redefinição de senha, por favor ignore este e-mail. Sua senha permanecerá inalterada.
                          </p>
                          <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            <strong>Nota:</strong> Este link expira em 1 hora por motivos de segurança.
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                            © ${new Date().getFullYear()} TherapyPro. Todos os direitos reservados.
                          </p>
                          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                            Gestão profissional para terapeutas
                          </p>
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