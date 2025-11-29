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
  // Fallback to production domain
  return 'https://therapypro.app.br';
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
    const { email } = await req.json();
    
    console.log('[Resend Email] Iniciando reenvio para:', email);

    if (!email) {
      console.error('[Resend Email] Email não fornecido');
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se as variáveis de ambiente estão configuradas
    if (!SENDPULSE_API_ID || !SENDPULSE_API_SECRET) {
      console.error('[Resend Email] Credenciais SendPulse não configuradas');
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

    // Buscar usuário por email
    console.log('[Resend Email] Buscando usuário:', email);
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Resend Email] Erro ao listar usuários:', listError);
      throw new Error('Erro ao buscar usuário');
    }

    const existingUser = existingUsers?.users.find(u => u.email === email);
    
    if (!existingUser) {
      console.error('[Resend Email] Usuário não encontrado');
      throw new Error('Usuário não encontrado');
    }

    console.log('[Resend Email] Usuário encontrado:', existingUser.id);

    // Verificar email_confirmed_strict no profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email_confirmed_strict, nome')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[Resend Email] Profile não encontrado ou erro ao buscar. Prosseguindo com upsert...', profileError);
    }

    // Se já confirmou pelo sistema strict, bloquear
    if (profileData?.email_confirmed_strict === true) {
      console.log('[Resend Email] Email já confirmado (strict)');
      throw new Error('Sua conta já está confirmada. Faça login normalmente.');
    }

    console.log('[Resend Email] Email não confirmado (strict), gerando novo link...');

    // Gerar novo nonce para invalidar links anteriores
    const nonce = crypto.randomUUID();
    const nonceExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    console.log('[Resend Email] Gerando novo nonce:', nonce);

    // UPSERT do profile (trata caso onde profile não existe ainda)
    const { data: upsertData, error: upsertProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: existingUser.id,
        nome: profileData?.nome || existingUser.user_metadata?.nome || 'Usuário',
        profissao: existingUser.user_metadata?.profissao || 'Psicólogo',
        email_confirmed_strict: false,
        email_confirmation_nonce: nonce,
        email_confirmation_nonce_expires_at: nonceExpiresAt
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select();

    if (upsertProfileError) {
      console.error('[Resend Email] Erro ao fazer upsert do profile:', upsertProfileError);
      throw new Error('Erro ao gerar link de confirmação');
    }

    console.log('[Resend Email] Profile upsert realizado (links anteriores invalidados):', upsertData);

    // Gerar novo link de confirmação com nonce
    const redirectTo = `${SITE_URL}/auth-confirm?n=${nonce}`;

    // Usar magiclink para evitar erro email_exists
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo
      }
    });

    if (linkError || !linkData) {
      console.error('[Resend Email] Erro ao gerar link:', linkError);
      throw new Error('Falha ao gerar link de confirmação');
    }

// Gerar link final com fallback robusto PREFERINDO hashed_token e apontando para o frontend
let confirmationLink: string;
const hashedToken = linkData?.properties?.hashed_token as string | undefined;

if (hashedToken) {
  // Preferir link direto para o frontend (AuthConfirm)
  const url = new URL(`${SITE_URL}/auth-confirm`);
  url.searchParams.set('type', 'magiclink');
  url.searchParams.set('token_hash', hashedToken);
  url.searchParams.set('n', nonce);
  confirmationLink = url.toString();
  console.log('[Resend Email] Link FRONTEND gerado via hashed_token');
} else if (linkData?.properties?.action_link) {
  // Fallback para action_link: extrair token e construir link do frontend
  try {
    const u = new URL(linkData.properties.action_link as string);
    const fallbackToken = u.searchParams.get('token') || u.searchParams.get('token_hash') || '';
    if (fallbackToken) {
      const url = new URL(`${SITE_URL}/auth-confirm`);
      url.searchParams.set('type', 'magiclink');
      url.searchParams.set('token_hash', fallbackToken);
      url.searchParams.set('n', nonce);
      confirmationLink = url.toString();
      console.log('[Resend Email] Link FRONTEND gerado via action_link');
    } else {
      throw new Error('token ausente no action_link');
    }
  } catch (e) {
    console.error('[Resend Email] Falha ao processar action_link:', e);
    throw new Error('Não foi possível gerar o link de confirmação');
  }
} else {
  console.error('[Resend Email] Nenhum token disponível no retorno do generateLink');
  throw new Error('Não foi possível gerar o link de confirmação');
}

console.log('[Resend Email] Link final (preview):', confirmationLink.substring(0, 80) + '...');

    // Obter token do SendPulse
    let accessToken;
    try {
      accessToken = await getSendPulseToken();
    } catch (error) {
      console.error('[Resend Email] Erro ao obter token SendPulse:', error);
      throw new Error('Falha ao configurar envio de email');
    }

    // Construir email HTML
    const userName = profileData?.nome || 'Usuário';
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
                            Recebemos sua solicitação para reenviar o link de confirmação.
                          </p>
                          <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                            Para confirmar seu endereço de e-mail e acessar o <strong>TherapyPro</strong>, clique no botão abaixo:
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
                            Se você não solicitou este e-mail, ignore esta mensagem.
                          </p>
                          <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            <strong>Nota:</strong> Este link expira em 24 horas e invalida todos os links anteriores.
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
          text: `Olá!\n\nVocê solicitou o reenvio do link de confirmação de e-mail para sua conta no TherapyPro.\n\nPor favor, confirme seu endereço de e-mail clicando no link abaixo:\n\n${confirmationLink}\n\n- Se o botão não funcionar, copie e cole o link acima no seu navegador.\n\nEste link expira em 24 horas.\n\nSe você não solicitou este e-mail, ignore-o.`,
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
    console.log('[SendPulse] Email reenviado com sucesso:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'E-mail de confirmação reenviado com sucesso! Verifique sua caixa de entrada.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Resend Email] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});