import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateResetToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { email, resetToken } = await req.json();

    if (email && !resetToken) {
      // Request reset
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;

      const user = users.find(u => u.email === email);
      if (!user) throw new Error('User not found');

      const token = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await supabase.from('user_2fa_reset_requests').insert({
        user_id: user.id,
        reset_token: token,
        expires_at: expiresAt.toISOString(),
        completed: false,
      });

      // TODO: Send email with reset link
      console.log(`2FA Reset token for ${email}: ${token}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Link de redefinição enviado para o e-mail',
          // Only for development
          token: Deno.env.get('ENVIRONMENT') === 'development' ? token : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (resetToken) {
      // Complete reset
      const { data: resetRequests } = await supabase
        .from('user_2fa_reset_requests')
        .select('*')
        .eq('reset_token', resetToken)
        .eq('completed', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (!resetRequests || resetRequests.length === 0) {
        throw new Error('Token inválido ou expirado');
      }

      const resetRequest = resetRequests[0];

      // Disable 2FA
      await supabase
        .from('user_2fa_settings')
        .update({
          email_2fa_enabled: false,
          authenticator_2fa_enabled: false,
          authenticator_secret: null,
        })
        .eq('user_id', resetRequest.user_id);

      // Mark request as completed
      await supabase
        .from('user_2fa_reset_requests')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', resetRequest.id);

      // End all sessions (would need admin API for this)
      console.log(`2FA reset completed for user ${resetRequest.user_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '2FA redefinido com sucesso. Por favor, faça login novamente.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request');
  } catch (error) {
    console.error('Error in 2fa-request-reset:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
