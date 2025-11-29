import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { encryptFields } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Comprehensive validation schema matching client-side validation
const clientRegistrationSchema = z.object({
  nome: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  
  email: z.string().trim().email({ message: "Email inválido" }).max(255).optional().or(z.literal('')),
  
  telefone: z.string()
    .trim()
    .min(1, { message: "Telefone é obrigatório" })
    .max(20, { message: "Telefone deve ter no máximo 20 caracteres" }),
  
  cpf: z.string().trim().max(20).optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  genero: z.string().max(50).optional().or(z.literal('')),
  endereco: z.string().trim().max(500).optional().or(z.literal('')),
  profissao: z.string().trim().max(100).optional().or(z.literal('')),
  plano_saude: z.string().trim().max(100).optional().or(z.literal('')),
  
  medicamentos: z.array(z.string().trim().max(200))
    .max(50, { message: "Máximo de 50 medicamentos" })
    .optional(),
  
  tratamento: z.string().trim().max(1000).optional().or(z.literal('')),
  pais: z.string().trim().max(100).optional().or(z.literal('')),
  eh_crianca_adolescente: z.boolean().optional(),
  emergencia_igual_pais: z.boolean().optional(),
  
  nome_pai: z.string().trim().max(100).optional().or(z.literal('')),
  telefone_pai: z.string().trim().max(20).optional().or(z.literal('')),
  nome_mae: z.string().trim().max(100).optional().or(z.literal('')),
  telefone_mae: z.string().trim().max(20).optional().or(z.literal('')),
  
  contato_emergencia_1_nome: z.string().trim().max(100).optional().or(z.literal('')),
  contato_emergencia_1_telefone: z.string().trim().max(20).optional().or(z.literal('')),
  contato_emergencia_2_nome: z.string().trim().max(100).optional().or(z.literal('')),
  contato_emergencia_2_telefone: z.string().trim().max(20).optional().or(z.literal('')),
  
  avatar_url: z.string().trim().max(500).optional().or(z.literal('')),
});

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
    const body = await req.json();
    const { token, clientData } = body;

    if (!token || !clientData) {
      console.log('[REGISTER-CLIENT] Missing token or clientData');
      return new Response(
        JSON.stringify({ error: 'Token e dados do cliente são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[REGISTER-CLIENT] Processing registration for token:', token);

    // Comprehensive input validation
    const validationResult = clientRegistrationSchema.safeParse(clientData);
    
    if (!validationResult.success) {
      console.log('[REGISTER-CLIENT] Validation failed:', validationResult.error.errors);
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({ 
          error: firstError.message || 'Dados inválidos',
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use validated data
    const validatedClientData = validationResult.data;

    // Encrypt sensitive fields before saving
    const encryptedData = await encryptFields(validatedClientData, [
      'tratamento'
    ]);

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

    // Call the transactional RPC function to register client with encrypted data
    const { data: result, error: rpcError } = await supabase.rpc('register_client_from_token', {
      p_token: token,
      p_client_data: encryptedData
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

    // Extract user_id from result or query token
    let userId = null
    if (result && typeof result === 'object') {
      userId = (result as any).user_id
    }
    
    if (!userId) {
      const { data: tokenData } = await supabase
        .from('registration_tokens')
        .select('user_id')
        .eq('token', token)
        .single()
      userId = tokenData?.user_id
    }

    if (userId) {
        // Create notification for professional about new client registration
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            titulo: 'Novo paciente cadastrado',
            conteudo: `${validatedClientData.nome} se cadastrou via link público`,
            data: new Date().toISOString(),
            lida: false
          })

      if (notifError) {
        console.error('[REGISTER-CLIENT] Error creating notification:', notifError)
      } else {
        console.log('[REGISTER-CLIENT] Notification created for professional')
        
        // Send Web Push notification with internal authentication
        try {
          await fetch(`${supabaseUrl}/functions/v1/push-broadcast`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': supabaseKey, // Internal auth for server-to-server calls
            },
            body: JSON.stringify({
              user_id: userId,
              title: 'Novo paciente cadastrado',
              body: `${validatedClientData.nome} se cadastrou via link público`,
              url: '/clientes',
              tag: 'new-client',
            }),
          })
          console.log('[REGISTER-CLIENT] Web Push sent')
        } catch (pushError) {
          console.error('[REGISTER-CLIENT] Error sending Web Push:', pushError)
          // Non-critical, continue
        }
      }
    }

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
