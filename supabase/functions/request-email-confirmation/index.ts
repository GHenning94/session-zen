import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDPULSE_API_ID = Deno.env.get('SENDPULSE_API_ID');
const SENDPULSE_API_SECRET = Deno.env.get('SENDPULSE_API_SECRET');

// Get the site URL from request origin or use default
function getSiteUrl(req: Request): string {
  const origin = req.headers.get('origin');
  if (origin) {
    return origin;
  }
  // Fallback to lovable app domain
  return 'https://ykwszazxigjivjkagjmf.lovable.app';
}

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
    const { email, password, user_metadata, captchaToken } = await req.json();
    
    console.log('[Email Confirmation] Iniciando processo de registro para:', email);

    if (!email || !password) {
      console.error('[Email Confirmation] Email ou senha não fornecidos');
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se as variáveis de ambiente estão configuradas
    if (!SENDPULSE_API_ID || !SENDPULSE_API_SECRET) {
      console.error('[Email Confirmation] Credenciais SendPulse não configuradas');
      return new Response(
        JSON.stringify({ error: 'Serviço de email não configurado corretamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const SITE_URL = getSiteUrl(req);

    // Criar cliente Supabase Admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar se o usuário já existe
    console.log('[Email Confirmation] Verificando se usuário já existe:', email);
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Email Confirmation] Erro ao listar usuários:', listError);
    }

    const existingUser = existingUsers?.users.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      console.log('[Email Confirmation] Usuário já existe:', existingUser.id);
      
      // Buscar o status strict no profiles
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('email_confirmed_strict')
        .eq('user_id', existingUser.id)
        .single();
      
      // Se o usuário já confirmou via nosso sistema strict, bloquear
      if (profileData?.email_confirmed_strict === true) {
        throw new Error('Esta conta já está ativa. Faça login.');
      }
      
      userId = existingUser.id;
      console.log('[Email Confirmation] Prosseguindo com usuário existente não confirmado');
    } else {
      // Usuário não existe, criar novo
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: user_metadata || {}
      });

      if (signUpError) {
        console.error('[Email Confirmation] Erro ao criar usuário:', signUpError);
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Falha ao criar usuário');
      }

      userId = signUpData.user.id;
      console.log('[Email Confirmation] Usuário criado:', userId);
    }

    // Gerar nonce único para invalidar links anteriores
    const nonce = crypto.randomUUID();
    const nonceExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    console.log('[Email Confirmation] Gerando nonce:', nonce);

    // UPSERT atômico do profile com nonce (garante que profile sempre existirá)
    const { data: upsertData, error: upsertProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        nome: user_metadata?.nome || 'Usuário',
        profissao: user_metadata?.profissao || 'Psicólogo',
        email_confirmed_strict: false,
        email_confirmation_nonce: nonce,
        email_confirmation_nonce_expires_at: nonceExpiresAt
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select();

    if (upsertProfileError) {
      console.error('[Email Confirmation] Erro ao fazer upsert do profile:', upsertProfileError);
      throw new Error('Erro ao gerar link de confirmação');
    }

    console.log('[Email Confirmation] Profile upsert realizado com sucesso:', upsertData);

    // Gerar link de confirmação com nonce no redirectTo
    const redirectTo = `${SITE_URL}/auth-confirm?n=${nonce}`;
    
    let linkData;
    let linkType: 'signup' | 'magiclink' = 'signup';
    
    try {
      console.log('[Email Confirmation] Tentando gerar link tipo signup...');
      const { data: generatedLinkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
        options: {
          redirectTo
        }
      });

      if (linkError) {
        // Se der erro email_exists, tentar magiclink
        if (linkError.message?.includes('email_exists') || linkError.status === 422) {
          console.log('[Email Confirmation] Email já existe, usando magiclink...');
          linkType = 'magiclink';
          
          const { data: magicLinkData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
              redirectTo
            }
          });

          if (magicError || !magicLinkData) {
            console.error('[Email Confirmation] Erro ao gerar magiclink:', magicError);
            throw new Error('Falha ao gerar link de confirmação');
          }

          linkData = magicLinkData;
        } else {
          throw linkError;
        }
      } else if (!generatedLinkData) {
        throw new Error('Link não gerado');
      } else {
        linkData = generatedLinkData;
      }

      console.log(`[Email Confirmation] Link tipo ${linkType} gerado com sucesso`);
    } catch (error) {
      console.error('[Email Confirmation] Erro ao gerar link:', error);
      throw new Error('Falha ao gerar link de confirmação');
    }

// Gerar link final com fallback robusto
let confirmationLink = linkData?.properties?.action_link as string | undefined;
const hashedToken = linkData?.properties?.hashed_token as string | undefined;
if (!confirmationLink && hashedToken) {
  const url = new URL(`${SUPABASE_URL}/auth/v1/verify`);
  url.searchParams.set('token_hash', hashedToken);
  url.searchParams.set('type', linkType);
  url.searchParams.set('redirect_to', redirectTo);
  confirmationLink = url.toString();
}
if (!confirmationLink) {
  console.error('[Email Confirmation] action_link e hashed_token ausentes no retorno do generateLink');
  throw new Error('Não foi possível gerar o link de confirmação');
}
console.log('[Email Confirmation] Link final gerado (preview):', confirmationLink.substring(0, 80) + '...');

    // Obter token do SendPulse
    let accessToken;
    try {
      accessToken = await getSendPulseToken();
    } catch (error) {
      console.error('[Email Confirmation] Erro ao obter token SendPulse:', error);
      throw new Error('Falha ao configurar envio de email');
    }

    // Construir email HTML
    const userName = user_metadata?.nome || 'Usuário';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirme seu e-mail - TherapyPro</title>
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
                            Bem-vindo ao <strong>TherapyPro</strong>! Estamos muito felizes em tê-lo conosco.
                          </p>
                          <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            Para começar a usar nossa plataforma, confirme seu endereço de e-mail clicando no botão abaixo:
                          </p>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${confirmationLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Confirmar E-mail</a>
                          </div>
                          <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            <strong>Se o botão não funcionar</strong>, copie e cole este link no seu navegador:
                          </p>
                          <p style="margin: 0 0 30px 0;">
                            <a href="${confirmationLink}" style="color: #2563eb; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; display: inline-block; max-width: 100%; text-decoration: underline; font-size: 14px;">${confirmationLink}</a>
                          </p>
                          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            Se você não criou uma conta no TherapyPro, ignore este e-mail.
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
          text: `Olá, ${userName}!\n\nBem-vindo ao TherapyPro!\n\nConfirme seu e-mail acessando o link abaixo:\n${confirmationLink}\n<${confirmationLink}>\n\nSe o botão não funcionar no seu cliente de e-mail, copie e cole um dos links acima no navegador.\n\nSe você não criou uma conta, ignore este e-mail.\n\nEste link expira em 24 horas.`,
          subject: 'Confirme seu e-mail - TherapyPro',
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
      console.error('[SendPulse] Status code:', emailResponse.status);
      throw new Error('Falha ao enviar email de confirmação. Por favor, tente novamente.');
    }

    const emailResult = await emailResponse.json();
    console.log('[SendPulse] Email enviado com sucesso:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta criada com sucesso! Verifique seu email para confirmar.',
        user: {
          id: userId,
          email: email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Email Confirmation] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});