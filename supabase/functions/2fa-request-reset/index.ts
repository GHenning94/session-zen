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

// Sanitize IP address
function sanitizeIP(rawIp: string): string {
  const clientIp = (rawIp.split(',')[0] || '').trim()
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^(::1|[a-fA-F0-9:]+)$/
  
  if (ipv4Regex.test(clientIp) || ipv6Regex.test(clientIp)) {
    return clientIp
  }
  return '0.0.0.0'
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

// Validate reset token format (hex string, 64 chars)
function isValidResetToken(token: string): boolean {
  const tokenRegex = /^[a-fA-F0-9]{64}$/
  return tokenRegex.test(token)
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

    // Rate limiting check with safe IP parsing
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const safeIp = sanitizeIP(rawIp)
    
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: safeIp,
      p_endpoint: '2fa-request-reset',
      p_max_requests: 3,
      p_window_minutes: 5
    });

    if (rateLimitError) {
      console.log('[2FA-RESET] Rate limit check error, allowing request');
    } else if (!rateLimitCheck) {
      console.log('[2FA-RESET] Rate limit exceeded');
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse input
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
    const resetToken = typeof body.resetToken === 'string' ? body.resetToken.trim() : null;

    // Validate inputs
    if (email && !resetToken) {
      // Request reset flow - validate email format
      if (!isValidEmail(email)) {
        return new Response(
          JSON.stringify({ error: 'Email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;

      const user = users.find(u => u.email === email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        console.log('[2FA-RESET] User not found (returning success for security)');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Se o e-mail existir, um link de redefinição será enviado'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await supabase.from('user_2fa_reset_requests').insert({
        user_id: user.id,
        reset_token: token,
        expires_at: expiresAt.toISOString(),
        completed: false,
      });

      console.log('[2FA-RESET] Reset token generated');

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
      // Complete reset flow - validate token format
      if (!isValidResetToken(resetToken)) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: resetRequests } = await supabase
        .from('user_2fa_reset_requests')
        .select('*')
        .eq('reset_token', resetToken)
        .eq('completed', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (!resetRequests || resetRequests.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Token inválido ou expirado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

      console.log('[2FA-RESET] Reset completed successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '2FA redefinido com sucesso. Por favor, faça login novamente.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Requisição inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[2FA-RESET] Unexpected error');
    return new Response(
      JSON.stringify({ error: 'Erro ao solicitar redefinição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
