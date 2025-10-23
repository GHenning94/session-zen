// supabase/functions/2fa-send-e-mail-code/index.ts
// ... (imports e funções de ajuda inalterados) ...
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { type Request } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = { /* ... */ };
function generateOTP(): string { /* ... */ }
async function getSendPulseToken(clientId: string, clientSecret: string): Promise<string> { /* ... */ }


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') { /* ... */ }

  try {
    // ... (Obter chaves, criar cliente supabase, autenticar utilizador - inalterado) ...
    const spApiClientId = Deno.env.get('SENDPULSE_API_ID') ?? '';
    const spApiSecret = Deno.env.get('SENDPULSE_API_SECRET') ?? '';
    const supabase = createClient(/* ... */);
    const authHeader = req.headers.get('Authorization');
    // ... (verificar authHeader, obter token, getUser) ...
    const user = userData.user;
    // ... (verificar se 2FA está ativo) ...

    // --- CORREÇÃO AQUI ---
    // 1. Invalidar códigos antigos com mais logs
    console.log(`Attempting to invalidate old email codes for user: ${user.id}`);
    const { error: updateError } = await supabase
      .from('user_2fa_email_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false); // Apenas os não utilizados

    // Verificar explicitamente se houve erro na invalidação
    if (updateError) {
      console.error(`ERROR invalidating old 2FA codes for user ${user.id}:`, updateError.message);
      // DECISÃO: Continuar mesmo assim ou parar? Por segurança, vamos parar.
      throw new Error(`Database error during code invalidation: ${updateError.message}`);
    } else {
      console.log(`Successfully invalidated old email codes for user: ${user.id}`);
    }
    // --- FIM DA CORREÇÃO ---

    // 2. Gerar e armazenar novo OTP (inalterado)
    const code = generateOTP();
    // ... (lógica de expiração e insert) ...

    // 3. Enviar e-mail com SendPulse (inalterado)
    const spAccessToken = await getSendPulseToken(spApiClientId, spApiSecret);
    // ... (lógica de envio do e-mail) ...

    return new Response( /* ... (resposta de sucesso inalterada) ... */ );

  } catch (error) {
    console.error('Error in 2fa-send-email-code:', error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response( /* ... (resposta de erro 500 inalterada) ... */ );
  }
});