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
    
    if (existingUser) {
      console.log('[Email Confirmation] Usuário já existe:', existingUser.id);
      
      // Se o usuário já existe mas não confirmou o email, deletar e recriar
      if (!existingUser.email_confirmed_at) {
        console.log('[Email Confirmation] Deletando usuário não confirmado para reenviar...');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        
        if (deleteError) {
          console.error('[Email Confirmation] Erro ao deletar usuário:', deleteError);
          throw new Error('Erro ao processar reenvio. Tente novamente.');
        }
      } else {
        // Se já confirmou, retornar erro
        throw new Error('Esta conta já está ativa. Faça login.');
      }
    }

    // Criar o usuário com autoConfirm false para que não envie email automático
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Não confirmar automaticamente
      user_metadata: user_metadata || {}
    });

    if (signUpError) {
      console.error('[Email Confirmation] Erro ao criar usuário:', signUpError);
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('Falha ao criar usuário');
    }

    const userId = signUpData.user.id;
    console.log('[Email Confirmation] Usuário criado:', userId);

    // Gerar link de confirmação
    let linkData;
    try {
      const { data: generatedLinkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
        options: {
          redirectTo: `${SITE_URL}/auth-confirm`
        }
      });

      if (linkError || !generatedLinkData) {
        console.error('[Email Confirmation] Erro ao gerar link:', linkError);
        // ROLLBACK: Deletar usuário recém-criado
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log('[Email Confirmation] Rollback: Usuário deletado após falha na geração do link');
        throw new Error('Falha ao gerar link de confirmação');
      }

      linkData = generatedLinkData;
      console.log('[Email Confirmation] Link de confirmação gerado');
    } catch (error) {
      // ROLLBACK: Garantir que o usuário seja deletado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log('[Email Confirmation] Rollback: Usuário deletado após exceção na geração do link');
      throw error;
    }

    // Usar action_link diretamente (inclui token e tipo no hash, não na query string)
    const confirmationLink = linkData.properties.action_link;

    // Obter token do SendPulse
    let accessToken;
    try {
      accessToken = await getSendPulseToken();
    } catch (error) {
      console.error('[Email Confirmation] Erro ao obter token SendPulse:', error);
      // ROLLBACK: Deletar usuário recém-criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log('[Email Confirmation] Rollback: Usuário deletado após falha no SendPulse token');
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
                    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Olá, ${userName}! 👋</h2>
                    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                      Bem-vindo ao <strong>TherapyPro</strong>! Estamos muito felizes em tê-lo conosco.
                    </p>
                    <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                      Para começar a usar nossa plataforma, por favor confirme seu endereço de e-mail clicando no botão abaixo:
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${confirmationLink}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                            Confirmar E-mail
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      Se você não criou uma conta no TherapyPro, por favor ignore este e-mail.
                    </p>
                    
                    <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      <strong>Nota:</strong> Este link expira em 24 horas.
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
    `;

    // Enviar email via SendPulse
    let emailResponse;
    try {
      emailResponse = await fetch('https://api.sendpulse.com/smtp/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: {
            html: emailHtml,
            text: `Olá, ${userName}!\n\nBem-vindo ao TherapyPro! Para confirmar seu e-mail, acesse o link: ${confirmationLink}\n\nSe você não criou uma conta, ignore este e-mail.\n\nEste link expira em 24 horas.`,
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
        // ROLLBACK: Deletar usuário recém-criado
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log('[Email Confirmation] Rollback: Usuário deletado após falha no envio do email');
        return new Response(
          JSON.stringify({ error: 'Falha ao enviar email de confirmação. Por favor, tente novamente.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    } catch (error) {
      console.error('[SendPulse] Exceção ao enviar email:', error);
      // ROLLBACK: Deletar usuário recém-criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log('[Email Confirmation] Rollback: Usuário deletado após exceção no envio do email');
      throw new Error('Falha ao enviar email de confirmação');
    }

    const emailResult = await emailResponse.json();
    console.log('[SendPulse] Email enviado com sucesso:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta criada com sucesso! Verifique seu email para confirmar.',
        user: {
          id: signUpData.user.id,
          email: signUpData.user.email
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
