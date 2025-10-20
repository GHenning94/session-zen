import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { email, emailCode, authenticatorCode, backupCode } = await req.json();

    // Get user by email
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const user = users.find(u => u.email === email);
    if (!user) throw new Error('User not found');

    // Get 2FA settings
    const { data: settings } = await supabase
      .from('user_2fa_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings) throw new Error('2FA not configured');

    let emailVerified = !settings.email_2fa_enabled;
    let authenticatorVerified = !settings.authenticator_2fa_enabled;

    // Verify email code if enabled
    if (settings.email_2fa_enabled && emailCode) {
      const { data: emailCodes } = await supabase
        .from('user_2fa_email_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code', emailCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (emailCodes && emailCodes.length > 0) {
        await supabase
          .from('user_2fa_email_codes')
          .update({ used: true })
          .eq('id', emailCodes[0].id);
        emailVerified = true;
      }
    }

    // Verify authenticator code if enabled
    if (settings.authenticator_2fa_enabled && authenticatorCode) {
      // TODO: Implement TOTP verification
      // For now, accept any 6-digit code for testing
      if (/^\d{6}$/.test(authenticatorCode)) {
        authenticatorVerified = true;
      }
    }

    // Verify backup code if provided
    if (backupCode) {
      const { data: backupCodes } = await supabase
        .from('user_2fa_backup_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code', backupCode)
        .eq('used', false)
        .limit(1);

      if (backupCodes && backupCodes.length > 0) {
        await supabase
          .from('user_2fa_backup_codes')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('id', backupCodes[0].id);
        
        // Backup code bypasses all other verifications
        emailVerified = true;
        authenticatorVerified = true;
      }
    }

    const success = emailVerified && authenticatorVerified;

    return new Response(
      JSON.stringify({ 
        success,
        message: success ? 'Autenticação bem-sucedida' : 'Código(s) inválido(s)',
        verified: {
          email: emailVerified,
          authenticator: authenticatorVerified,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in 2fa-verify-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
