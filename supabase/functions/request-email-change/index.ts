import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { new_email, user_name, password, skip_password_check } = await req.json();

    console.log('[Request Email Change] Iniciando mudança de email para:', new_email);

    if (!new_email) {
      throw new Error('Novo email é obrigatório');
    }

    // Se não for skip_password_check, exigir senha
    if (!skip_password_check) {
      if (!password) {
        throw new Error('Senha é obrigatória para confirmar a mudança');
      }

      // Verificar senha do usuário
      console.log('[Request Email Change] Verificando senha do usuário');
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (signInError) {
        console.error('[Request Email Change] Senha incorreta:', signInError);
        
        // Buscar nome do usuário para o email
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('nome')
          .eq('user_id', user.id)
          .single();

        const userName = profile?.nome || user_name || 'Usuário';

        // Enviar email de alerta de tentativa falha
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-security-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              email: user.email,
              type: 'failed_email_change_attempt',
              userName: userName,
              newEmail: new_email
            })
          });
        } catch (emailError) {
          console.error('[Request Email Change] Erro ao enviar notificação de falha:', emailError);
        }

        throw new Error('Senha incorreta');
      }
    } else {
      console.log('[Request Email Change] Pulando verificação de senha (2FA já verificado)');
    }

    // Validar se o novo email já está em uso
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const emailInUse = existingUsers?.users.find(u => u.email === new_email && u.id !== user.id);
    
    if (emailInUse) {
      throw new Error('Este email já está em uso');
    }

    // Gerar nonce único
    const nonce = crypto.randomUUID();
    const nonceExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    console.log('[Request Email Change] Salvando dados pendentes no profile');

    // Salvar dados pendentes no profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        pending_new_email: new_email,
        email_change_nonce: nonce,
        email_change_nonce_expires_at: nonceExpiresAt
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Request Email Change] Erro ao atualizar profile:', updateError);
      throw new Error('Erro ao preparar mudança de email');
    }

    // Buscar nome do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nome')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.nome || user_name || 'Usuário';
    const confirmationLink = `${SITE_URL}/auth-confirm?type=email_change&n=${nonce}`;

    console.log('[Request Email Change] Enviando email via SendPulse');

    // Obter token do SendPulse
    const accessToken = await getSendPulseToken();

    // Construir email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirme sua mudança de e-mail - TherapyPro</title>
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
                          <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Olá, ${userName}! 👋</h2>
                          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            Você solicitou a alteração do seu e-mail no <strong>TherapyPro</strong>.
                          </p>
                          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            <strong>Novo e-mail:</strong> ${new_email}
                          </p>
                          <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            Para confirmar esta mudança, clique no botão abaixo:
                          </p>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${confirmationLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Confirmar Mudança de E-mail</a>
                          </div>
                          <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            Ou copie e cole este link no seu navegador:
                          </p>
                          <p style="margin: 0 0 30px 0;">
                            <a href="${confirmationLink}" style="color: #2563eb; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; display: inline-block; max-width: 100%; text-decoration: underline; font-size: 14px;">${confirmationLink}</a>
                          </p>
                          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            Se você não solicitou esta mudança, ignore este e-mail.
                          </p>
                          <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            <strong>Nota:</strong> Este link expira em 24 horas.
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
    `;

    // Enviar email via SendPulse
    const emailResponse = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: {
          html: emailHtml,
          text: `Olá, ${userName}!\n\nVocê solicitou a alteração do seu e-mail no TherapyPro.\n\nNovo e-mail: ${new_email}\n\nConfirme esta mudança acessando o link: ${confirmationLink}\n\nSe você não solicitou esta mudança, ignore este e-mail.\n\nEste link expira em 24 horas.`,
          subject: 'Confirme sua mudança de e-mail - TherapyPro',
          from: {
            name: 'TherapyPro',
            email: 'nao-responda@therapypro.app.br',
          },
          to: [
            {
              email: new_email,
            },
          ],
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[Request Email Change] Erro ao enviar email:', errorText);
      throw new Error('Erro ao enviar email de confirmação');
    }

    const result = await emailResponse.json();
    console.log('[Request Email Change] Email enviado com sucesso:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de confirmação enviado para o novo endereço' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Request Email Change] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});