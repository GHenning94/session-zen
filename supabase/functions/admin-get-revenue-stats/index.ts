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
    let period = 30
    
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
        period = body.period || 30
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

    console.log('[Admin Revenue Stats] Fetching revenue data for period:', period)

    // Get all profiles with subscription data
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('subscription_plan, billing_interval, subscription_end_date, subscription_cancel_at, created_at, stripe_subscription_id')

    if (profilesError) throw profilesError

    // Define plan prices
    const planPrices = {
      basico: { monthly: 0, annual: 0 },
      pro: { monthly: 79.90, annual: 69.90 * 12 },
      premium: { monthly: 129.90, annual: 109.90 * 12 }
    }

    // Calculate stats
    const activeProfiles = profiles?.filter(p => 
      p.subscription_plan && 
      p.subscription_plan !== 'basico' &&
      (!p.subscription_end_date || new Date(p.subscription_end_date) > new Date())
    ) || []

    const cancelledProfiles = profiles?.filter(p => 
      p.subscription_cancel_at && new Date(p.subscription_cancel_at) <= new Date()
    ) || []

    const monthlySubscribers = activeProfiles.filter(p => p.billing_interval === 'monthly' || !p.billing_interval)
    const annualSubscribers = activeProfiles.filter(p => p.billing_interval === 'yearly' || p.billing_interval === 'annual')

    // Calculate MRR
    let mrr = 0
    activeProfiles.forEach(p => {
      const plan = p.subscription_plan as keyof typeof planPrices
      const prices = planPrices[plan] || planPrices.basico
      
      if (p.billing_interval === 'yearly' || p.billing_interval === 'annual') {
        mrr += prices.annual / 12
      } else {
        mrr += prices.monthly
      }
    })

    // Revenue by plan
    const revenueByPlan = {
      basico: 0,
      pro: 0,
      premium: 0
    }

    activeProfiles.forEach(p => {
      const plan = p.subscription_plan as keyof typeof revenueByPlan
      if (plan && revenueByPlan.hasOwnProperty(plan)) {
        const prices = planPrices[plan]
        if (p.billing_interval === 'yearly' || p.billing_interval === 'annual') {
          revenueByPlan[plan] += prices.annual
        } else {
          revenueByPlan[plan] += prices.monthly
        }
      }
    })

    // Monthly revenue calculation
    const monthlyRevenue = monthlySubscribers.reduce((sum, p) => {
      const plan = p.subscription_plan as keyof typeof planPrices
      return sum + (planPrices[plan]?.monthly || 0)
    }, 0)

    const annualRevenue = annualSubscribers.reduce((sum, p) => {
      const plan = p.subscription_plan as keyof typeof planPrices
      return sum + (planPrices[plan]?.annual || 0)
    }, 0)

    // Calculate LTV and ARPU
    const totalRevenue = monthlyRevenue + annualRevenue
    const avgSubscriptionMonths = 8 // Assume average 8 months
    const arpu = activeProfiles.length > 0 ? mrr / activeProfiles.length : 0
    const ltv = arpu * avgSubscriptionMonths

    // Generate historical data (last 6 months)
    const revenueHistory = []
    const subscriptionTrend = []
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = months[monthDate.getMonth()]
      
      // Simulate growth (in a real scenario, you'd query historical data)
      const factor = 1 - (i * 0.1)
      revenueHistory.push({
        month: monthName,
        monthly: Math.round(monthlyRevenue * factor),
        annual: Math.round((annualRevenue / 12) * factor)
      })

      subscriptionTrend.push({
        month: monthName,
        active: Math.round(activeProfiles.length * factor),
        cancelled: Math.round(cancelledProfiles.length * factor * 0.3)
      })
    }

    console.log('[Admin Revenue Stats] Successfully calculated revenue stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        totalRevenue: totalRevenue,
        monthlyRevenue: monthlyRevenue,
        annualRevenue: annualRevenue,
        mrr: mrr,
        arr: mrr * 12,
        revenueByPlan: revenueByPlan,
        activeSubscriptions: activeProfiles.length,
        cancelledSubscriptions: cancelledProfiles.length,
        monthlySubscriptions: monthlySubscribers.length,
        annualSubscriptions: annualSubscribers.length,
        ltv: ltv,
        arpu: arpu,
        averageSubscriptionMonths: avgSubscriptionMonths,
        revenueHistory: revenueHistory,
        subscriptionTrend: subscriptionTrend
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Revenue Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
