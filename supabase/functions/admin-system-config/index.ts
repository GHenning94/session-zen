import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session token from header or body
    let sessionToken = req.headers.get('X-Admin-Session')
    let bodyData: any = {}
    
    try {
      bodyData = await req.json()
      if (!sessionToken) {
        sessionToken = bodyData.sessionToken
      }
    } catch {
      // Body parsing failed
    }

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin session
    const { data: session, error: sessionError } = await supabaseClient
      .from('admin_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired admin session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = session.user_id

    // Return system configuration (always return config for POST as well)
    const config = {
      environment: Deno.env.get('ENVIRONMENT') || 'production',
      supabase_url: Deno.env.get('SUPABASE_URL'),
      has_stripe_key: !!Deno.env.get('STRIPE_SECRET_KEY'),
      has_encryption_key: !!Deno.env.get('ENCRYPTION_KEY'),
      has_vapid_keys: !!(Deno.env.get('VAPID_PUBLIC_KEY') && Deno.env.get('VAPID_PRIVATE_KEY')),
      has_gemini_key: !!Deno.env.get('GEMINI_API_KEY'),
      has_sendpulse_keys: !!(Deno.env.get('SENDPULSE_API_ID') && Deno.env.get('SENDPULSE_API_SECRET')),
      ga_tracking_id: 'G-KB3SCVSH9B',
    }

    // Handle action if provided in body
    if (bodyData.action === 'regenerate_encryption_key') {
      await supabaseClient.from('audit_log').insert({
        user_id: userId,
        action: 'ENCRYPTION_KEY_REGENERATION_REQUESTED',
        table_name: 'system_config',
        record_id: 'encryption',
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          config,
          message: 'Encryption key regeneration logged. Please update keys in Supabase dashboard.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, config }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})