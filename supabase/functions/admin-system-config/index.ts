import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verify admin session
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid session')
    }

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roles) {
      throw new Error('Unauthorized: Admin access required')
    }

    if (req.method === 'GET') {
      // Return system configuration
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

      return new Response(
        JSON.stringify({ success: true, config }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { action } = await req.json()

      if (action === 'regenerate_encryption_key') {
        // Note: Actual key regeneration should be done through Supabase dashboard
        await supabaseClient.from('audit_log').insert({
          user_id: user.id,
          action: 'ENCRYPTION_KEY_REGENERATION_REQUESTED',
          table_name: 'system_config',
          record_id: 'encryption',
        })

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Encryption key regeneration logged. Please update keys in Supabase dashboard.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw new Error('Invalid action')
    }

    throw new Error('Invalid method')
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