import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
import { type Request } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getSendPulseToken(clientId: string, clientSecret: string): Promise<string> {
  // ... (código idêntico)
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

serve(async (req: Request) => { // <--- TIPO ADICIONADO AQUI
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const spApiClientId = Deno.env.get('SENDPULSE_API_ID') ?? '';
    const spApiSecret = Deno.env.get('SENDPULSE_API_SECRET') ?? '';
    // ... (restante da lógica de autenticação e envio) ...
    
    // Invalidar códigos antigos (a sua correção de segurança)
    await supabase
      .from('user_2fa_email_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);
      
    // ... (restante da lógica) ...
      
  } catch (error) {
    console.error('Error in 2fa-send-email-code:', error);
    // --- TIPO ADICIONADO AQUI ---
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});