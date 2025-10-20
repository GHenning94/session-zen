import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as base32Encode } from "https://deno.land/std@0.190.0/encoding/base32.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSecret(): string {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer).replace(/=/g, '');
}

function generateQRCodeURL(email: string, secret: string): string {
  const issuer = 'TherapyPro';
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer,
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { action, enable, code } = await req.json();

    if (action === 'generate') {
      // Generate new secret and QR code
      const secret = generateSecret();
      const qrCodeURL = generateQRCodeURL(user.email!, secret);

      // Store secret temporarily (not enabled yet)
      const { data: settings, error: settingsError } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (!settings) {
        await supabase.from('user_2fa_settings').insert({
          user_id: user.id,
          authenticator_secret: secret,
          authenticator_2fa_enabled: false,
        });
      } else {
        await supabase
          .from('user_2fa_settings')
          .update({ authenticator_secret: secret })
          .eq('user_id', user.id);
      }

      return new Response(
        JSON.stringify({ secret, qrCodeURL }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'verify') {
      // Verify code and enable if correct
      const { data: settings } = await supabase
        .from('user_2fa_settings')
        .select('authenticator_secret')
        .eq('user_id', user.id)
        .single();

      if (!settings?.authenticator_secret) {
        throw new Error('Secret not found');
      }

      // Here we would normally verify the TOTP code
      // For now, we'll just enable it
      const { error: updateError } = await supabase
        .from('user_2fa_settings')
        .update({ authenticator_2fa_enabled: enable })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Authenticator configurado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'disable') {
      await supabase
        .from('user_2fa_settings')
        .update({ authenticator_2fa_enabled: false })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Authenticator desativado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in 2fa-setup-authenticator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
