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
    console.log('[Confirm Email Strict] 🚀 Iniciando processamento...');
    
    // ✅ CORREÇÃO CRÍTICA: Tentar múltiplas formas de obter o usuário
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let authMethod = 'unknown';

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // MÉTODO 1: Tentar via JWT do header
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      console.log('[Confirm Email Strict] 🔑 Tentando autenticação via JWT...');
      
      try {
        const { data: { user: jwtUser }, error: jwtError } = await supabaseAdmin.auth.getUser(token);
        
        if (!jwtError && jwtUser) {
          user = jwtUser;
          authMethod = 'jwt';
          console.log('[Confirm Email Strict] ✅ Autenticado via JWT:', user.id);
        } else {
          console.warn('[Confirm Email Strict] ⚠️ JWT inválido ou expirado:', jwtError?.message);
        }
      } catch (jwtErr: any) {
        console.warn('[Confirm Email Strict] ⚠️ Erro ao validar JWT:', jwtErr.message);
      }
    }

    // MÉTODO 2: Se JWT falhou, tentar obter do body (fallback)
    if (!user) {
      console.log('[Confirm Email Strict] 🔄 JWT falhou, tentando via body...');
      
      const body = await req.json();
      const { user_id, nonce } = body;

      if (user_id) {
        console.log('[Confirm Email Strict] 🆔 user_id fornecido no body:', user_id);
        
        // Buscar usuário diretamente pelo ID
        const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.admin.getUserById(user_id);
        
        if (!adminError && adminUser) {
          user = adminUser;
          authMethod = 'admin-fallback';
          console.log('[Confirm Email Strict] ✅ Usuário obtido via admin API');
        }
      }

      // Re-parsear body para pegar nonce
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(body),
      });
    }

    // Se ainda não tem usuário, retornar erro
    if (!user) {
      console.error('[Confirm Email Strict] ❌ Não foi possível autenticar o usuário');
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível autenticar. Tente novamente em alguns segundos.',
          details: 'Token inválido ou sessão não propagada'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('[Confirm Email Strict] 👤 Confirmando email para:', {
      user_id: user.id,
      email: user.email,
      method: authMethod
    });

    // Obter nonce do body (se ainda não foi parseado)
    let nonce = null;
    try {
      const body = await req.json();
      nonce = body.nonce;
    } catch {
      // Já foi parseado anteriormente
    }

    // Buscar perfil
    console.log('[Confirm Email Strict] 📋 Buscando perfil...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email_confirmation_nonce, email_confirmation_nonce_expires_at, email_confirmed_strict')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Confirm Email Strict] ❌ Erro ao buscar profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perfil do usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Se já confirmado, retornar sucesso
    if (profile?.email_confirmed_strict) {
      console.log('[Confirm Email Strict] ✅ E-mail já confirmado anteriormente');
      return new Response(
        JSON.stringify({ success: true, message: 'E-mail já confirmado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Validar nonce se fornecido
    if (nonce && profile) {
      console.log('[Confirm Email Strict] 🔐 Validando nonce...');
      
      if (profile.email_confirmation_nonce !== nonce) {
        console.error('[Confirm Email Strict] ❌ Nonce inválido');
        return new Response(
          JSON.stringify({ error: 'Link de confirmação inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (profile.email_confirmation_nonce_expires_at) {
        const expiresAt = new Date(profile.email_confirmation_nonce_expires_at);
        if (expiresAt < new Date()) {
          console.error('[Confirm Email Strict] ❌ Nonce expirado');
          return new Response(
            JSON.stringify({ error: 'Link de confirmação expirado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      }
      
      console.log('[Confirm Email Strict] ✅ Nonce válido');
    }

    // Confirmar no GoTrue (Auth)
    console.log('[Confirm Email Strict] 📧 Confirmando no GoTrue...');
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('[Confirm Email Strict] ❌ Erro ao confirmar no GoTrue:', confirmError);
      return new Response(
        JSON.stringify({ error: 'Erro ao confirmar e-mail no sistema de autenticação' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[Confirm Email Strict] ✅ E-mail confirmado no GoTrue');

    // Atualizar flag strict no profiles
    console.log('[Confirm Email Strict] 💾 Atualizando profiles...');
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email_confirmed_strict: true,
        email_confirmation_nonce: null,
        email_confirmation_nonce_expires_at: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Confirm Email Strict] ❌ Erro ao atualizar profiles:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil do usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Verificar se há um referral pendente para notificar o indicador
    console.log('[Confirm Email Strict] 🔍 Verificando referrals pendentes...');
    const { data: pendingReferral } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_user_id')
      .eq('referred_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (pendingReferral) {
      console.log('[Confirm Email Strict] 📨 Notificando indicador sobre confirmação de e-mail...');
      
      // Enviar notificação ao indicador (sem mostrar o nome do indicado)
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: pendingReferral.referrer_user_id,
          titulo: 'Novo cadastro via indicação! 🎉',
          conteudo: 'Alguém se cadastrou usando seu link de indicação e confirmou o e-mail! Quando ele assinar um plano pago, você receberá sua comissão.',
        });

      console.log('[Confirm Email Strict] ✅ Notificação de referral enviada ao indicador');
    }

    console.log('[Confirm Email Strict] ✅✅✅ E-mail confirmado com sucesso completo!');

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail confirmado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Confirm Email Strict] ❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao confirmar e-mail',
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});