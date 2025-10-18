import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClientData {
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  endereco?: string;
  cpf?: string;
  profissao?: string;
  plano_saude?: string;
  medicamentos?: string[];
  tratamento?: string;
  eh_crianca_adolescente?: boolean;
  nome_pai?: string;
  telefone_pai?: string;
  nome_mae?: string;
  telefone_mae?: string;
  contato_emergencia_1_nome?: string;
  contato_emergencia_1_telefone?: string;
  contato_emergencia_2_nome?: string;
  contato_emergencia_2_telefone?: string;
  pais?: string;
  emergencia_igual_pais?: boolean;
  avatar_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { token, clientData }: { token: string; clientData: ClientData } = await req.json();

    if (!token || !clientData) {
      console.log('[REGISTER-CLIENT] Missing token or clientData');
      return new Response(
        JSON.stringify({ error: 'Token e dados do cliente são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[REGISTER-CLIENT] Processing registration for token:', token);

    // Rate limiting check with safe IP parsing
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const clientIp = (rawIp.split(',')[0] || '').trim();
    const safeIp = clientIp && /^(\d{1,3}\.){3}\d{1,3}$|^::1$|^[a-fA-F0-9:]+$/.test(clientIp) ? clientIp : '0.0.0.0';
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: safeIp,
      p_endpoint: 'register-client-via-token',
      p_max_requests: 10,
      p_window_minutes: 1
    });

    if (rateLimitError) {
      console.log('[REGISTER-CLIENT] Rate limit check error, allowing request:', rateLimitError);
    } else if (!rateLimitCheck) {
      console.log('[REGISTER-CLIENT] Rate limit exceeded for IP:', safeIp);
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic validation of required fields
    if (!clientData.nome || !clientData.email) {
      console.log('[REGISTER-CLIENT] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Nome e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the transactional RPC function to register client
    const { data: result, error: rpcError } = await supabase.rpc('register_client_from_token', {
      p_token: token,
      p_client_data: clientData
    });

    if (rpcError) {
      console.error('[REGISTER-CLIENT] RPC error:', rpcError);
      
      // Check if it's a token validation error
      if (rpcError.message?.includes('inválido') || rpcError.message?.includes('expirado') || rpcError.message?.includes('utilizado')) {
        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao cadastrar cliente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[REGISTER-CLIENT] Registration completed successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        professionalName: result.professional_name,
        clientId: result.client_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REGISTER-CLIENT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});