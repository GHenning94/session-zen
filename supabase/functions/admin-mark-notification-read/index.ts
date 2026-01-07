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

    // Get session token from header
    let sessionToken = req.headers.get('X-Admin-Session')
    
    const bodyData = await req.json()
    
    if (!sessionToken) {
      sessionToken = bodyData.sessionToken
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

    const { notification_id, mark_all } = bodyData

    if (mark_all) {
      // Mark all as read
      const { error: updateError } = await supabaseClient
        .from('admin_notifications')
        .update({ read: true })
        .eq('read', false)

      if (updateError) throw updateError

      console.log('All notifications marked as read')
    } else if (notification_id) {
      // Mark single notification as read
      const { error: updateError } = await supabaseClient
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', notification_id)

      if (updateError) throw updateError

      console.log(`Notification ${notification_id} marked as read`)
    } else {
      throw new Error('Either notification_id or mark_all must be provided')
    }

    return new Response(
      JSON.stringify({ success: true }),
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
