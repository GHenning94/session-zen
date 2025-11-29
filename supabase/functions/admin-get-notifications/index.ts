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

    // Verify admin session from token
    const authHeader = req.headers.get('x-admin-token')
    if (!authHeader) {
      throw new Error('No admin token provided')
    }

    const { data: sessionData, error: sessionError } = await supabaseClient.functions.invoke('admin-verify-session', {
      body: { sessionToken: authHeader }
    })
    
    if (sessionError || !sessionData.valid) {
      throw new Error('Invalid admin session')
    }

    const url = new URL(req.url)
    const unreadOnly = url.searchParams.get('unread_only') === 'true'
    const severity = url.searchParams.get('severity')
    const type = url.searchParams.get('type')
    const limit = parseInt(url.searchParams.get('limit') || '50')

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
