import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const window = 1; // Allow ±1 time step for clock drift
    
    // Decode base32 secret
    const secretBytes = base32Decode(secret);
    
    // Import key for HMAC-SHA1
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(secretBytes.buffer),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    // Check current time window and adjacent windows
    for (let i = -window; i <= window; i++) {
      const time = Math.floor(epoch / timeStep) + i;
      
      // Create counter buffer (8 bytes, big-endian)
      const counter = new ArrayBuffer(8);
      const view = new DataView(counter);
      view.setUint32(4, time, false); // Big-endian
      
      // Generate HMAC-SHA1
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        counter
      );
      
      const hash = new Uint8Array(signature);
      
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
      if (settings.authenticator_secret && /^\d{6}$/.test(authenticatorCode)) {
        authenticatorVerified = await verifyTOTP(settings.authenticator_secret, authenticatorCode);
        console.log('TOTP verification result:', authenticatorVerified);
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
    const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar código';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
