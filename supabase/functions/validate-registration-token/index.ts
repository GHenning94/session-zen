import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with SERVICE_ROLE_KEY for RLS bypass
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get token from URL params or request body
    let token;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    } else {
      const body = await req.json();
      token = body.token;
    }

    if (!token) {
      return new Response(
        JSON.stringify({ 
          status: 'invalid',
          error: 'Token é obrigatório' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[VALIDATE-TOKEN] Validating token:', token);

    // Rate limiting check with safe IP parsing
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const clientIp = (rawIp.split(',')[0] || '').trim();
    const safeIp = clientIp && /^(\d{1,3}\.){3}\d{1,3}$|^::1$|^[a-fA-F0-9:]+$/.test(clientIp) ? clientIp : '0.0.0.0';
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: safeIp,
      p_endpoint: 'validate-registration-token',
      p_max_requests: 5,
      p_window_minutes: 1
    });

    if (rateLimitError) {
      console.log('[VALIDATE-TOKEN] Rate limit check error, allowing request:', rateLimitError);
    } else if (!rateLimitCheck) {
      console.log('[VALIDATE-TOKEN] Rate limit exceeded for IP:', safeIp);
      return new Response(
        JSON.stringify({ 
          status: 'rate_limited',
          error: 'Muitas requisições. Tente novamente em alguns instantes.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token exists
    const { data: tokenData, error: tokenError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.log('[VALIDATE-TOKEN] Token not found:', tokenError);
      return new Response(
        JSON.stringify({ 
          status: 'not_found',
          error: 'Link inválido ou expirado' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token was already used
    if (tokenData.used) {
      console.log('[VALIDATE-TOKEN] Token already used:', token);
      return new Response(
        JSON.stringify({ 
          status: 'used',
          error: 'Este link já foi utilizado.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt <= now) {
      console.log('[VALIDATE-TOKEN] Token expired:', token);
      return new Response(
        JSON.stringify({ 
          status: 'expired',
          error: 'Link inválido ou expirado' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get professional name
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', tokenData.user_id)
      .maybeSingle();

    const professionalName = profile?.nome || 'Profissional';

    console.log('[VALIDATE-TOKEN] Valid token for professional:', tokenData.user_id);

    return new Response(
      JSON.stringify({
        status: 'valid',
        professionalName,
        expiresAt: tokenData.expires_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VALIDATE-TOKEN] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});