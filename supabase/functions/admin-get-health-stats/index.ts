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
    
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
      } catch {
        // Body parsing failed
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

    console.log('[Admin Health Stats] Fetching health data')

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, nome, subscription_plan, created_at, updated_at')

    if (profilesError) throw profilesError

    // Get user auth data for last sign in
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers()
    
    if (usersError) throw usersError

    const usersMap = (users || []).reduce((acc: any, u: any) => {
      acc[u.id] = u
      return acc
    }, {})

    // Get sessions from last 30 days per user
    const { data: recentSessions } = await supabaseClient
      .from('sessions')
      .select('user_id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const sessionsPerUser: Record<string, number> = {}
    recentSessions?.forEach(s => {
      sessionsPerUser[s.user_id] = (sessionsPerUser[s.user_id] || 0) + 1
    })

    // Get pending/overdue payments
    const { data: overduePayments } = await supabaseClient
      .from('payments')
      .select('id')
      .eq('status', 'pendente')
      .lt('data_vencimento', now.toISOString())

    // Calculate risk levels for each user
    const atRiskAccounts: any[] = []
    let highRiskCount = 0
    let mediumRiskCount = 0
    let noLogin7d = 0
    let noSessions30d = 0
    let planLimitReached = 0
    let highLtvPotential = 0

    profiles?.forEach(profile => {
      const user = usersMap[profile.user_id]
      const lastLogin = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null
      const sessions30d = sessionsPerUser[profile.user_id] || 0
      const email = user?.email || ''

      let riskLevel = 'low'
      const riskFactors: string[] = []

      // Check last login
      if (!lastLogin || lastLogin < fourteenDaysAgo) {
        riskFactors.push('no_login_14d')
        riskLevel = 'high'
        highRiskCount++
      } else if (lastLogin < sevenDaysAgo) {
        riskFactors.push('no_login_7d')
        if (riskLevel !== 'high') riskLevel = 'medium'
        mediumRiskCount++
        noLogin7d++
      }

      // Check sessions
      if (sessions30d === 0) {
        riskFactors.push('no_sessions_30d')
        noSessions30d++
        if (riskLevel !== 'high') riskLevel = 'medium'
      }

      // Check for high LTV potential (pro or premium with good activity)
      if ((profile.subscription_plan === 'pro' || profile.subscription_plan === 'premium') && sessions30d > 10) {
        highLtvPotential++
      }

      // Add to at-risk accounts if any risk factors
      if (riskLevel === 'high' || riskLevel === 'medium') {
        atRiskAccounts.push({
          id: profile.user_id,
          nome: profile.nome,
          email: email,
          subscription_plan: profile.subscription_plan,
          last_login: lastLogin?.toISOString() || null,
          sessions_30d: sessions30d,
          risk_level: riskLevel,
          risk_factors: riskFactors,
          status: profile.subscription_plan === 'basico' ? 'Free' : 'Pagante'
        })
      }
    })

    // Sort at-risk accounts by risk level (high first)
    atRiskAccounts.sort((a, b) => {
      if (a.risk_level === 'high' && b.risk_level !== 'high') return -1
      if (a.risk_level !== 'high' && b.risk_level === 'high') return 1
      return 0
    })

    console.log('[Admin Health Stats] Successfully calculated health stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          highRiskCount,
          mediumRiskCount,
          noLogin7d,
          overduePayments: overduePayments?.length || 0,
          noSessions30d,
          planLimitReached,
          highLtvPotential
        },
        atRiskAccounts: atRiskAccounts.slice(0, 50)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Health Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
