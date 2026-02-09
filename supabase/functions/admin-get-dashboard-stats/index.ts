import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

// Preços dos planos (valores atuais da plataforma - R$)
const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  basico: { monthly: 0, annual: 0 },
  pro: { monthly: 29.90, annual: 298.80 },
  premium: { monthly: 49.90, annual: 498.96 }
}

const PLAN_COLORS: Record<string, string> = {
  basico: '#94a3b8',
  pro: '#3b82f6',
  premium: '#8b5cf6'
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

    // 1) Profiles com dados de assinatura (para MRR, paying users, distribuição)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, subscription_plan, billing_interval, subscription_end_date, subscription_cancel_at, created_at')

    if (profilesError) {
      console.error('[Admin Dashboard Stats] Profiles error:', profilesError)
      throw profilesError
    }

    const totalUsers = profiles?.length ?? 0

    // Usuários pagantes: plano ativo (pro ou premium) e assinatura não expirada
    const payingProfiles = (profiles ?? []).filter(p => {
      const plan = (p.subscription_plan || '').toLowerCase()
      if (!plan || plan === 'basico') return false
      const endDate = p.subscription_end_date ? new Date(p.subscription_end_date) : null
      if (endDate && endDate < new Date()) return false
      return true
    })
    const payingUsers = payingProfiles.length

    // MRR: soma da receita mensal recorrente por assinante
    let mrr = 0
    payingProfiles.forEach(p => {
      const plan = (p.subscription_plan || 'pro').toLowerCase()
      const prices = PLAN_PRICES[plan] || PLAN_PRICES.pro
      const isAnnual = p.billing_interval === 'yearly' || p.billing_interval === 'annual'
      mrr += isAnnual ? prices.annual / 12 : prices.monthly
    })

    const arr = mrr * 12
    const arpu = payingUsers > 0 ? mrr / payingUsers : 0
    const conversionRate = totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0
    const nrr = 100 // NRR simplificado; pode ser calculado com dados históricos depois

    // Distribuição por plano (contagem)
    const planCount: Record<string, number> = { basico: 0, pro: 0, premium: 0 }
    ;(profiles ?? []).forEach(p => {
      const plan = (p.subscription_plan || 'basico').toLowerCase()
      if (planCount[plan] !== undefined) {
        planCount[plan]++
      } else {
        planCount.basico++
      }
    })

    const planDistribution = [
      { name: 'Básico', value: planCount.basico, color: PLAN_COLORS.basico },
      { name: 'Pro', value: planCount.pro, color: PLAN_COLORS.pro },
      { name: 'Premium', value: planCount.premium, color: PLAN_COLORS.premium }
    ].filter(d => d.value > 0)

    // Receita por plano (MRR por plano)
    const mrrByPlan: Record<string, number> = { basico: 0, pro: 0, premium: 0 }
    payingProfiles.forEach(p => {
      const plan = (p.subscription_plan || 'pro').toLowerCase()
      if (!mrrByPlan.hasOwnProperty(plan)) return
      const prices = PLAN_PRICES[plan] || PLAN_PRICES.pro
      const isAnnual = p.billing_interval === 'yearly' || p.billing_interval === 'annual'
      mrrByPlan[plan] += isAnnual ? prices.annual / 12 : prices.monthly
    })

    const revenueByPlan = [
      { plan: 'Básico', value: Math.round(mrrByPlan.basico * 100) / 100 },
      { plan: 'Pro', value: Math.round(mrrByPlan.pro * 100) / 100 },
      { plan: 'Premium', value: Math.round(mrrByPlan.premium * 100) / 100 }
    ].filter(d => d.value > 0)

    // 2) Novos usuários por mês (últimos 6 meses)
    const now = new Date()
    const userGrowth: { month: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const count = (profiles ?? []).filter(p => {
        const created = new Date(p.created_at)
        return created >= start && created <= end
      }).length
      userGrowth.push({
        month: MONTH_NAMES[start.getMonth()],
        value: count
      })
    }

    // 3) Evolução do MRR (últimos 6 meses) - aproximação por pagamentos recebidos no mês
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const { data: paymentsLast6Months } = await supabase
      .from('payments')
      .select('valor, created_at')
      .eq('status', 'pago')
      .gte('created_at', sixMonthsAgo.toISOString())
    const revenueByMonth: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      revenueByMonth[key] = 0
    }
    ;(paymentsLast6Months ?? []).forEach(p => {
      const created = new Date(p.created_at)
      const key = `${created.getFullYear()}-${created.getMonth()}`
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += Number(p.valor) || 0
      }
    })
    const mrrHistory = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [y, m] = key.split('-').map(Number)
        return { month: MONTH_NAMES[m], value: Math.round(val * 100) / 100 }
      })

    // Se não houver histórico de pagamentos, usar MRR atual no último mês para não ficar vazio
    const hasAnyMrrHistory = mrrHistory.some(d => d.value > 0)
    if (!hasAnyMrrHistory && mrr > 0 && mrrHistory.length > 0) {
      mrrHistory[mrrHistory.length - 1].value = Math.round(mrr * 100) / 100
    }

    // 4) Contagens gerais
    const [
      sessionsCountResult,
      clientsCountResult,
      pendingPaymentsResult,
      criticalAlertsResult,
      newUsersResult,
      completedSessionsResult,
      revenueResult
    ] = await Promise.all([
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('admin_notifications').select('id', { count: 'exact', head: true })
        .eq('read', false)
        .eq('severity', 'critical'),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('sessions').select('id', { count: 'exact', head: true })
        .eq('status', 'realizada')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('payments').select('valor')
        .eq('status', 'pago')
        .gte('created_at', thirtyDaysAgo.toISOString())
    ])

    const revenue30d = revenueResult.data?.reduce((sum, p) => sum + (Number(p.valor) || 0), 0) || 0
    const criticalCount = criticalAlertsResult.count || 0
    let systemHealth = "Excelente"
    if (criticalCount > 5) systemHealth = "Crítico"
    else if (criticalCount > 2) systemHealth = "Atenção"
    else if (criticalCount > 0) systemHealth = "Bom"

    // Crescimento de MRR vs mês anterior (simplificado)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const { data: prevPayments } = await supabase
      .from('payments')
      .select('valor')
      .eq('status', 'pago')
      .gte('created_at', prevMonthStart.toISOString())
      .lte('created_at', prevMonthEnd.toISOString())
    const prevRevenue = (prevPayments ?? []).reduce((s, p) => s + (Number(p.valor) || 0), 0)
    const revenueGrowth = prevRevenue > 0 ? ((revenue30d - prevRevenue) / prevRevenue) * 100 : 0

    const response = {
      totalUsers,
      activeUsers: totalUsers,
      payingUsers,
      newUsers30d: newUsersResult.count ?? 0,
      totalSessions: sessionsCountResult.count ?? 0,
      totalClients: clientsCountResult.count ?? 0,
      sessionsCompleted30d: completedSessionsResult.count ?? 0,
      pendingPayments: pendingPaymentsResult.count ?? 0,
      criticalAlerts: criticalCount,
      revenue30d,
      revenueGrowth,
      systemHealth,
      mrr,
      arr,
      arpu,
      conversionRate,
      customerChurn: 0,
      revenueChurn: 0,
      nrr,
      mrrHistory,
      userGrowth,
      planDistribution,
      revenueByPlan
    }

    console.log('[Admin Dashboard Stats] Stats retrieved:', { totalUsers, payingUsers, mrr, arr, charts: { mrrHistory: mrrHistory.length, userGrowth: userGrowth.length, planDistribution: planDistribution.length, revenueByPlan: revenueByPlan.length } })

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
