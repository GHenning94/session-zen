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

    const unreadOnly = bodyData.unread_only === true
    const severity = bodyData.severity
    const type = bodyData.type
    const limit = parseInt(bodyData.limit || '50')

    // Build query
    let query = supabaseClient
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) throw notificationsError

    // Get statistics
    const { data: stats } = await supabaseClient
      .from('admin_notifications')
      .select('severity, read, type')

    const statistics = {
      total: stats?.length || 0,
      unread: stats?.filter(n => !n.read).length || 0,
      critical: stats?.filter(n => n.severity === 'critical').length || 0,
      by_type: {
        security: stats?.filter(n => n.type === 'security').length || 0,
        payment: stats?.filter(n => n.type === 'payment').length || 0,
        usage: stats?.filter(n => n.type === 'usage').length || 0,
        system: stats?.filter(n => n.type === 'system').length || 0,
      }
    }

    console.log('Notifications retrieved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        notifications,
        stats: statistics
      }),
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
