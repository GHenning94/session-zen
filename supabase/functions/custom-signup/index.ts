// supabase/functions/custom-signup/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { type Request } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Funções de Ajuda (SendPulse e Captcha) ---
async function getSendPulseToken(clientId: string, clientSecret: string): Promise<string> {
  // ... (código idêntico ao da função 2fa-send-e-mail-code)
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

async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY') ?? '';
  if (!secret) throw new Error("Chave secreta do Cloudflare Turnstile não configurada.");
  
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: secret,
      response: token,
    }),
  });
  const data = await response.json();
  return data.success;
}
// --- Fim das Funções de Ajuda ---

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- ATUALIZADO: Receber o captchaToken ---
    const { email, password, metadata, captchaToken } = await req.json();

    if (!email || !password || !captchaToken) { // <-- Adicionado captchaToken aqui
      throw new Error("E-mail, senha e token de verificação são obrigatórios.");
    }

    // 1. Verificar o Captcha (Turnstile)
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      throw new Error("Falha na verificação de segurança (Captcha). Tente novamente.");
    }

    // 2. Obter chaves do SendPulse e Supabase
    const spApiClientId = Deno.env.get('SENDPULSE_API_ID') ?? '';
    const spApiSecret = Deno.env.get('SENDPULSE_API_SECRET') ?? '';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 3. VERIFICAR E-MAIL DUPLICADO (Correção 1.1)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({ email });

    if (existingUser?.users && existingUser.users.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Conta já existente, realize o login.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Criar o Utilizador
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: metadata,
      email_confirm: false, // Vamos confirmar manualmente
    });

    if (createError) throw createError;
    const user = createData.user;
    if (!user) throw new Error("Falha ao criar utilizador.");

    // 5. Gerar o link de confirmação
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      // --- ATUALIZADO: Redirecionar para a página correta ---
      redirectTo: `${Deno.env.get('SITE_URL')}/auth/confirm` // Usa a sua página existente
    });

    if (linkError) throw linkError;
    const confirmationLink = linkData.properties?.confirmation_url;
    if (!confirmationLink) throw new Error("Não foi possível gerar o link de confirmação.");

    // 6. Enviar e-mail com SendPulse (Correção 1.2)
    const spAccessToken = await getSendPulseToken(spApiClientId, spApiSecret);
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Bem-vindo(a) ao TherapyPro!</h2>
        <p>Olá, ${metadata?.nome || ''}!</p>
        <p>Estamos quase a terminar. Por favor, confirme o seu e-mail clicando no link abaixo:</p>
        <p><a href="${confirmationLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Confirmar meu E-mail</a></p>
        <p>Se você não se cadastrou, pode ignorar este e-mail.</p>
      </div>
    `; // (Mesmo HTML de antes)

    const sendEmailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spAccessToken}` },
      body: JSON.stringify({
        email: {
          html: emailHtml,
          text: `Bem-vindo! Confirme seu e-mail aqui: ${confirmationLink}`,
          subject: 'Confirme seu e-mail - TherapyPro',
          from: { name: 'TherapyPro', email: 'nao-responda@therapypro.app.br' },
          to: [{ email }],
        },
      }),
    });

    if (!sendEmailResponse.ok) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error('Falha ao enviar o e-mail de confirmação. Tente novamente.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Conta criada! Verifique seu e-mail para confirmar.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in custom-signup:', error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    if (errorMessage.includes('Conta já existente')) {
      return new Response(JSON.stringify({ error: errorMessage }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});