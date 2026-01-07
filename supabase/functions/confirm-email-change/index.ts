import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nonce } = await req.json();

    console.log('[Confirm Email Change] Iniciando confirmação com nonce:', nonce);

    if (!nonce) {
      throw new Error('Token inválido');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar profile pelo nonce
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, pending_new_email, email_change_nonce_expires_at')
      .eq('email_change_nonce', nonce)
      .single();

    if (profileError || !profile) {
      console.error('[Confirm Email Change] Profile não encontrado:', profileError);
      throw new Error('Link inválido ou já utilizado');
    }

    // Verificar expiração
    if (new Date(profile.email_change_nonce_expires_at) < new Date()) {
      throw new Error('Link expirado');
    }

    if (!profile.pending_new_email) {
      throw new Error('Nenhuma mudança de email pendente');
    }

    // Obter email antigo e nome do usuário ANTES de atualizar
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    const oldEmail = userData?.user?.email;

    console.log('[Confirm Email Change] Atualizando email no auth.users');

    // Atualizar email no auth.users usando admin API
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { email: profile.pending_new_email }
    );

    if (updateAuthError) {
      console.error('[Confirm Email Change] Erro ao atualizar auth.users:', updateAuthError);
      throw new Error('Erro ao atualizar email');
    }

    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('nome')
      .eq('user_id', profile.user_id)
      .single();

    // Enviar notificação de segurança APÓS confirmação bem-sucedida
    console.log('[Confirm Email Change] Enviando notificação de segurança');
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-security-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          email: oldEmail,
          type: 'email_changed',
          userName: profileData?.nome || 'Usuário',
          newEmail: profile.pending_new_email
        })
      });
    } catch (emailError) {
      console.error('[Confirm Email Change] Erro ao enviar notificação de segurança:', emailError);
      // Não bloquear a operação se o email falhar
    }

    console.log('[Confirm Email Change] Limpando dados pendentes do profile');

    // Limpar dados pendentes do profile
    const { error: clearError } = await supabaseAdmin
      .from('profiles')
      .update({
        pending_new_email: null,
        email_change_nonce: null,
        email_change_nonce_expires_at: null
      })
      .eq('user_id', profile.user_id);

    if (clearError) {
      console.error('[Confirm Email Change] Erro ao limpar dados pendentes:', clearError);
      // Não falha se der erro aqui, pois o email já foi atualizado
    }

    console.log('[Confirm Email Change] Email alterado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email alterado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Confirm Email Change] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});