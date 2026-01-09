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
    let filters: any = {}
    
    try {
      const body = await req.json()
      if (!sessionToken) {
        sessionToken = body.sessionToken
      }
      filters = body.filters || {}
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

    console.log('[Admin Referral Logs] Fetching referral audit logs')

    // Build query
    let query = supabaseClient
      .from('referral_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    // Apply filters
    if (filters.action && filters.action !== 'all') {
      query = query.eq('action', filters.action)
    }
    if (filters.gateway && filters.gateway !== 'all') {
      query = query.eq('gateway', filters.gateway)
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data: logs, error: logsError } = await query

    if (logsError) throw logsError

    // Get user profiles for names
    const allUserIds = [
      ...new Set([
        ...(logs?.map(l => l.referrer_user_id).filter(Boolean) || []),
        ...(logs?.map(l => l.referred_user_id).filter(Boolean) || [])
      ])
    ]

    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, nome')
      .in('user_id', allUserIds.length > 0 ? allUserIds : ['00000000-0000-0000-0000-000000000000'])

    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.user_id] = p
      return acc
    }, {})

    // Enrich logs with names
    const enrichedLogs = logs?.map(log => ({
      ...log,
      referrer_name: log.referrer_user_id ? profilesMap[log.referrer_user_id]?.nome || 'Usuário' : null,
      referred_name: log.referred_user_id ? profilesMap[log.referred_user_id]?.nome || 'Usuário' : null,
    })) || []

    // Calculate summary statistics
    const stats = {
      totalLogs: logs?.length || 0,
      byAction: {} as Record<string, number>,
      byGateway: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalGrossAmount: 0,
      totalNetAmount: 0,
      totalCommissions: 0,
      totalGatewayFees: 0,
    }

    logs?.forEach(log => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
      
      // Count by gateway
      if (log.gateway) {
        stats.byGateway[log.gateway] = (stats.byGateway[log.gateway] || 0) + 1
      }
      
      // Count by status
      if (log.status) {
        stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1
      }
      
      // Sum amounts
      stats.totalGrossAmount += log.gross_amount || 0
      stats.totalNetAmount += log.net_amount || 0
      stats.totalCommissions += log.commission_amount || 0
      stats.totalGatewayFees += log.gateway_fee || 0
    })

    console.log('[Admin Referral Logs] Found', enrichedLogs.length, 'logs')

    return new Response(
      JSON.stringify({ 
        success: true,
        logs: enrichedLogs,
        stats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Referral Logs] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
