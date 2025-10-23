// supabase/functions/custom-signup/index.ts
// ... (imports e funções de ajuda inalterados) ...
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { type Request } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = { /* ... */ };
async function getSendPulseToken(clientId: string, clientSecret: string): Promise<string> { /* ... */ }
async function verifyCaptcha(token: string): Promise<boolean> { /* ... */ }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') { /* ... */ }

  try {
    const { email, password, metadata, captchaToken } = await req.json();
    // ... (verificações de input e captcha) ...

    const supabaseAdmin = createClient( /* ... */ );

    // VERIFICAR E-MAIL DUPLICADO
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({ email });

    if (existingUser?.users && existingUser.users.length > 0) {
      // --- CORREÇÃO AQUI ---
      // Lançar um erro específico que o catch pode identificar
      throw new Error("DUPLICATE_EMAIL: Conta já existente, realize o login.");
      // --- FIM DA CORREÇÃO ---
    }

    // ... (Restante da lógica: criar utilizador, gerar link, enviar e-mail) ...
     const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({ /* ... */ });
     // ...
     const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ /* ... */ });
     // ...
     const spAccessToken = await getSendPulseToken(spApiClientId, spApiSecret);
     await fetch("https://api.sendpulse.com/smtp/emails", { /* ... */ });
     // ...

    return new Response(JSON.stringify({ success: true, message: 'Conta criada! Verifique seu e-mail para confirmar.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in custom-signup:', error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    // --- CORREÇÃO AQUI ---
    // Verificar o erro específico que lançámos
    if (errorMessage.startsWith("DUPLICATE_EMAIL:")) {
      const displayMessage = errorMessage.replace("DUPLICATE_EMAIL: ", "");
      return new Response(
        JSON.stringify({ error: displayMessage }), // Envia a mensagem correta
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Usa o status 409
      );
    }
    // Para todos os outros erros, usar 500
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    // --- FIM DA CORREÇÃO ---
  }
});