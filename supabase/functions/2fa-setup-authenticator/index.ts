import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as base32Encode } from "https://deno.land/std@0.190.0/encoding/base32.ts";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

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

function verifyTOTP(secret: string, token: string): boolean {
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const window = 1; // Allow ±1 time step for clock drift
    
    // Decode base32 secret
    const decoder = new TextDecoder();
    const secretBytes = base32Decode(secret);
    
    // Check current time window and adjacent windows
    for (let i = -window; i <= window; i++) {
      const time = Math.floor(epoch / timeStep) + i;
      const timeHex = time.toString(16).padStart(16, '0');
      const timeBytes = new Uint8Array(8);
      
      for (let j = 0; j < 8; j++) {
        timeBytes[j] = parseInt(timeHex.substr(j * 2, 2), 16);
      }
      
      // Generate HMAC-SHA1
      const hmac = createHmac('sha1', secretBytes);
      hmac.update(timeBytes);
      const hash = new Uint8Array(hmac.digest());
      
      // Dynamic truncation
      const offset = hash[hash.length - 1] & 0x0f;
      const code = (
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)
      ) % 1000000;
      
      const expectedToken = code.toString().padStart(6, '0');
      
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((base32.length * 5) / 8));
  
  for (let i = 0; i < base32.length; i++) {
    const char = base32.charAt(i).toUpperCase();
    if (char === '=') break;
    
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    
    value = (value << 5) | val;
    bits += 5;
    
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  
  return output.slice(0, index);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

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
        console.error('Secret not found for user:', user.id);
        return new Response(
          JSON.stringify({ error: 'Secret ausente. Por favor, gere um novo QR code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify TOTP code
      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ error: 'Código deve ter 6 dígitos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = verifyTOTP(settings.authenticator_secret, code);
      
      if (!isValid) {
        console.error('Invalid TOTP code for user:', user.id);
        return new Response(
          JSON.stringify({ error: 'Código TOTP inválido. Verifique o código no seu aplicativo.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Enable authenticator 2FA
      const { error: updateError } = await supabase
        .from('user_2fa_settings')
        .update({ authenticator_2fa_enabled: enable })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating 2FA settings:', updateError);
        throw updateError;
      }

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
