// supabase/functions/request-password-reset/index.ts
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
  // ... (código idêntico ao da função custom-signup)
}
async function verifyCaptcha(token: string): Promise<boolean> {
  // ... (código idêntico ao da função custom-signup)
}
// --- Fim das Funções de Ajuda ---

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, captchaToken } = await req.json();
    if (!email || !captchaToken) {
      throw new Error("E-mail e token de verificação são obrigatórios.");
    }

    // 1. Verificar o Captcha
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      throw new Error("Falha na verificação de segurança (Captcha).");
    }

    // 2. Obter chaves do SendPulse e Supabase
    const spApiClientId = Deno.env.get('SENDPULSE_API_ID') ?? '';
    const spApiSecret = Deno.env.get('SENDPULSE_API_SECRET') ?? '';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 3. Encontrar o usuário pelo e-mail
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers({ email });

    if (!user || user.users.length === 0) {
      console.warn(`Tentativa de reset de senha para e-mail não encontrado: ${email}`);
      return new Response(JSON.stringify({ success: true, message: 'Se o e-mail estiver correto, um link de redefinição será enviado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Gerar o link de reset (diferente do signup)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      redirectTo: `${Deno.env.get('SITE_URL')}/auth/confirm` // O Supabase trata isto
    });
    if (linkError) throw linkError;
    const resetLink = linkData.properties?.recovery_url; // Nota: 'recovery_url'

    // 5. Enviar o e-mail via SendPulse
    const spAccessToken = await getSendPulseToken(spApiClientId, spApiSecret);
    const emailHtml = `... (HTML do e-mail de Reset de Senha) ...`; // (Use o HTML da minha mensagem anterior)

    await fetch("https://api.sendpulse.com/smtp/emails", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spAccessToken}` },
      body: JSON.stringify({
        email: {
          html: emailHtml,
          text: `Redefina sua senha aqui: ${resetLink}`,
          subject: 'Redefinição de Senha - TherapyPro',
          from: { name: 'TherapyPro', email: 'nao-responda@therapypro.app.br' },
          to: [{ email }],
        },
      }),
    });

    return new Response(JSON.stringify({ success: true, message: 'Se o e-mail estiver correto, um link de redefinição será enviado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in request-password-reset:', error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});