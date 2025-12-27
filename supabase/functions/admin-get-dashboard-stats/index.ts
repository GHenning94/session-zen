import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allowed origins for admin panel
const ALLOWED_ORIGINS = [
  'https://therapypro.app.br',
  'https://www.therapypro.app.br',
  'https://ykwszazxigjivjkagjmf.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

// Parse cookies from header
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=')
    }
  })
  
  return cookies
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session token from X-Admin-Session header first, then cookie
    let sessionToken = req.headers.get('X-Admin-Session')
    
    // Fallback to cookie
    if (!sessionToken) {
      const cookies = parseCookies(req.headers.get('cookie'))
      sessionToken = cookies['admin_session']
    }

    if (!sessionToken) {
      console.error('[Admin Dashboard Stats] No session token')
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin session
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .single()

    if (sessionError || !session) {
      console.error('[Admin Dashboard Stats] Invalid session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      console.error('[Admin Dashboard Stats] Session expired')
      return new Response(
        JSON.stringify({ error: 'Sessão expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Admin Dashboard Stats] Fetching stats for admin session')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch all stats in parallel
    const [
      usersCountResult,
      sessionsCountResult,
      clientsCountResult,
      pendingPaymentsResult,
      criticalAlertsResult,
      newUsersResult,
      completedSessionsResult,
      revenueResult
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      
      // Total sessions
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      
      // Total clients
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      
      // Pending payments
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      
      // Critical alerts (unread with severity critical)
      supabase.from('admin_notifications').select('id', { count: 'exact', head: true })
        .eq('read', false)
        .eq('severity', 'critical'),
      
      // New users in last 30 days
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      // Completed sessions in last 30 days
      supabase.from('sessions').select('id', { count: 'exact', head: true })
        .eq('status', 'realizada')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      // Revenue in last 30 days (paid payments)
      supabase.from('payments').select('valor')
        .eq('status', 'pago')
        .gte('created_at', thirtyDaysAgo.toISOString())
    ])

    // Calculate revenue
    const revenue30d = revenueResult.data?.reduce((sum, p) => sum + (Number(p.valor) || 0), 0) || 0

    // Determine system health based on alerts
    const criticalCount = criticalAlertsResult.count || 0
    let systemHealth = "Excelente"
    if (criticalCount > 5) {
      systemHealth = "Crítico"
    } else if (criticalCount > 2) {
      systemHealth = "Atenção"
    } else if (criticalCount > 0) {
      systemHealth = "Bom"
    }

    const response = {
      totalUsers: usersCountResult.count || 0,
      activeUsers: usersCountResult.count || 0, // Could add activity tracking later
      totalSessions: sessionsCountResult.count || 0,
      totalClients: clientsCountResult.count || 0,
      pendingPayments: pendingPaymentsResult.count || 0,
      criticalAlerts: criticalCount,
      newUsers30d: newUsersResult.count || 0,
      sessionsCompleted30d: completedSessionsResult.count || 0,
      revenue30d: revenue30d,
      totalRevenue: revenue30d, // For backwards compatibility
      systemHealth: systemHealth
    }

    console.log('[Admin Dashboard Stats] Stats retrieved:', response)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Admin Dashboard Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})