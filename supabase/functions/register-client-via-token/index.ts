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

    if (!token || !clientData || !clientData.nome) {
      return new Response(
        JSON.stringify({ error: 'Token and client data with name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[REGISTER-CLIENT] Processing registration for token:', token);

    // Validate token and get professional info
    const { data: tokenData, error: tokenError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.log('[REGISTER-CLIENT] Invalid or expired token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const professionalId = tokenData.user_id;
    console.log('[REGISTER-CLIENT] Valid token for professional:', professionalId);

    // Get professional info
    const { data: professional } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', professionalId)
      .single();

    // Prepare client data for insertion
    const clientDataForDB = {
      ...clientData,
      user_id: professionalId,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert client into database
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert([clientDataForDB])
      .select()
      .single();

    if (clientError) {
      console.error('[REGISTER-CLIENT] Error inserting client:', clientError);
      return new Response(
        JSON.stringify({ error: 'Erro ao cadastrar cliente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[REGISTER-CLIENT] Client created successfully:', newClient.id);

    // Mark token as used
    const { error: updateTokenError } = await supabase
      .from('registration_tokens')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id);

    if (updateTokenError) {
      console.log('[REGISTER-CLIENT] Warning: Could not mark token as used:', updateTokenError);
    }

    // Create notification for professional
    const notificationTitle = 'Novo Cliente Cadastrado';
    const notificationContent = `${clientData.nome} se cadastrou através do seu link de cadastro público.`;

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: professionalId,
        titulo: notificationTitle,
        conteudo: notificationContent
      }]);

    if (notificationError) {
      console.log('[REGISTER-CLIENT] Warning: Could not create notification:', notificationError);
    } else {
      console.log('[REGISTER-CLIENT] Notification created for professional');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cadastro realizado com sucesso! O profissional será notificado.',
        client: {
          id: newClient.id,
          nome: newClient.nome
        },
        professional: {
          nome: professional?.nome || 'Profissional'
        }
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