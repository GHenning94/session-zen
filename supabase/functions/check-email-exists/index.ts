import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limiting check with safe IP parsing
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const clientIp = (rawIp.split(',')[0] || '').trim();
    const safeIp = clientIp && /^(\d{1,3}\.){3}\d{1,3}$|^::1$|^[a-fA-F0-9:]+$/.test(clientIp) ? clientIp : '0.0.0.0';
    
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: safeIp,
      p_endpoint: 'check-email-exists',
      p_max_requests: 10,
      p_window_minutes: 1
    });

    if (rateLimitError) {
      console.log('[CHECK-EMAIL] Rate limit check error, allowing request:', rateLimitError);
    } else if (!rateLimitCheck) {
      console.log('[CHECK-EMAIL] Rate limit exceeded for IP:', safeIp);
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Check if email exists in auth.users
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const user = data.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    const emailExists = !!user;
    let emailConfirmed = false;

    // Se o email existe, verificar se está confirmado na tabela profiles
    if (emailExists && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_confirmed_strict')
        .eq('user_id', user.id)
        .single();
      
      emailConfirmed = profile?.email_confirmed_strict === true;
    }

    return new Response(JSON.stringify({ exists: emailExists, emailConfirmed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error checking email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});