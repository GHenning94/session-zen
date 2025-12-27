import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
      } catch {
        // Body parsing failed, continue without
      }
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

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const logType = url.searchParams.get('type') || 'all'

    // Get audit logs
    const { data: auditLogs, error: auditError } = await supabaseClient
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (auditError) throw auditError

    // Get medical audit logs
    const { data: medicalLogs, error: medicalError } = await supabaseClient
      .from('medical_audit_log')
      .select('*')
      .order('access_timestamp', { ascending: false })
      .limit(limit)

    if (medicalError) throw medicalError

    // Get admin sessions
    const { data: adminSessions, error: sessionsError } = await supabaseClient
      .from('admin_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (sessionsError) throw sessionsError

    // Calculate statistics
    const stats = {
      total_audit_logs: auditLogs?.length || 0,
      total_medical_logs: medicalLogs?.length || 0,
      active_admin_sessions: adminSessions?.filter(s => !s.revoked && new Date(s.expires_at) > new Date()).length || 0,
      unauthorized_attempts: medicalLogs?.filter(l => l.action.includes('UNAUTHORIZED')).length || 0,
    }

    // Group logs by action type
    const actionCounts = auditLogs?.reduce((acc: any, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {})

    console.log('Logs data retrieved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        audit_logs: logType === 'all' || logType === 'audit' ? auditLogs : [],
        medical_logs: logType === 'all' || logType === 'medical' ? medicalLogs : [],
        admin_sessions: logType === 'all' || logType === 'sessions' ? adminSessions : [],
        stats,
        action_counts: actionCounts
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