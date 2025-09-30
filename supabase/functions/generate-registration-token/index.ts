import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

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

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[GENERATE-TOKEN] No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.log('[GENERATE-TOKEN] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GENERATE-TOKEN] User authenticated:', user.id);

    // Parse request body to check for forceNew flag
    const requestBody = await req.json().catch(() => ({}));
    const forceNew = requestBody.forceNew || false;

    // Get professional name for the response
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', user.id)
      .maybeSingle();

    const professionalName = profile?.nome || 'Profissional';

    // Check if there's already a valid token for this user (unless forcing new)
    if (!forceNew) {
      const { data: existingToken, error: existingError } = await supabase
        .from('registration_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingToken && !existingError) {
        console.log('[GENERATE-TOKEN] Returning existing valid token');

        const registrationUrl = `${req.headers.get('origin') || 'https://therapypro.lovable.app'}/register/${existingToken.token}`;

        return new Response(
          JSON.stringify({
            success: true,
            token: existingToken.token,
            registrationUrl,
            expiresAt: existingToken.expires_at,
            professionalName,
            isExisting: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[GENERATE-TOKEN] Generating new token for user:', user.id);

    // If forcing new, revoke all old tokens by marking them as used
    if (forceNew) {
      const { error: revokeError } = await supabase
        .from('registration_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('used', false);

      if (revokeError) {
        console.log('[GENERATE-TOKEN] Warning: Could not revoke old tokens:', revokeError);
      }
    }

    // Generate a secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert new token
    const { data: tokenData, error: insertError } = await supabase
      .from('registration_tokens')
      .insert([{
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      }])
      .select()
      .maybeSingle();

    if (insertError || !tokenData) {
      console.error('[GENERATE-TOKEN] Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GENERATE-TOKEN] Token generated successfully');

    const registrationUrl = `${req.headers.get('origin') || 'https://therapypro.lovable.app'}/register/${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        token,
        registrationUrl,
        expiresAt: expiresAt.toISOString(),
        professionalName,
        isExisting: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-TOKEN] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});