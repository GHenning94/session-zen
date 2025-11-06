import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header ausente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[Confirm Email Strict] Erro ao verificar JWT:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('[Confirm Email Strict] Confirmando email para user_id:', user.id);

    const { nonce } = await req.json();

    // Buscar perfil e validar nonce se fornecido
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email_confirmation_nonce, email_confirmation_nonce_expires_at, email_confirmed_strict')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Confirm Email Strict] Erro ao buscar profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perfil do usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Se já confirmado, retornar sucesso
    if (profile?.email_confirmed_strict) {
      console.log('[Confirm Email Strict] E-mail já confirmado anteriormente');
      return new Response(
        JSON.stringify({ success: true, message: 'E-mail já confirmado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Validar nonce se fornecido
    if (nonce && profile) {
      if (profile.email_confirmation_nonce !== nonce) {
        console.error('[Confirm Email Strict] Nonce inválido');
        return new Response(
          JSON.stringify({ error: 'Link de confirmação inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (profile.email_confirmation_nonce_expires_at) {
        const expiresAt = new Date(profile.email_confirmation_nonce_expires_at);
        if (expiresAt < new Date()) {
          console.error('[Confirm Email Strict] Nonce expirado');
          return new Response(
            JSON.stringify({ error: 'Link de confirmação expirado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      }
    }

    // Confirmar no GoTrue (Auth)
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('[Confirm Email Strict] Erro ao confirmar no GoTrue:', confirmError);
      return new Response(
        JSON.stringify({ error: 'Erro ao confirmar e-mail no sistema de autenticação' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[Confirm Email Strict] E-mail confirmado no GoTrue');

    // Atualizar flag strict no profiles
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email_confirmed_strict: true,
        email_confirmation_nonce: null,
        email_confirmation_nonce_expires_at: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Confirm Email Strict] Erro ao atualizar profiles:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil do usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[Confirm Email Strict] E-mail confirmado com sucesso (GoTrue + profiles)');

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail confirmado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Confirm Email Strict] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao confirmar e-mail' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
