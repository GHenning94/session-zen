import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

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
    
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
        filters = body.filters || {}
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

    console.log('[Admin Subscriptions Stats] Fetching subscription data')

    // Get all profiles with subscription data
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select(`
        user_id, nome, profissao, subscription_plan, billing_interval,
        stripe_customer_id, stripe_subscription_id, subscription_end_date,
        subscription_cancel_at, is_referral_partner, referral_code, created_at
      `)
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    // Get auth users for email
    const { data: authData } = await supabaseClient.auth.admin.listUsers({
      perPage: 1000
    })

    const emailMap: Record<string, string> = {}
    authData?.users?.forEach(u => {
      emailMap[u.id] = u.email || ''
    })

    // Get referrals to check if user was referred
    const { data: referrals } = await supabaseClient
      .from('referrals')
      .select('referred_user_id, referrer_user_id, referral_code')

    const referredMap: Record<string, { referrer_id: string; referral_code: string }> = {}
    referrals?.forEach(r => {
      referredMap[r.referred_user_id] = {
        referrer_id: r.referrer_user_id,
        referral_code: r.referral_code
      }
    })

    // Get referrer names
    const referrerIds = [...new Set(referrals?.map(r => r.referrer_user_id) || [])]
    const { data: referrerProfiles } = await supabaseClient
      .from('profiles')
      .select('user_id, nome')
      .in('user_id', referrerIds)

    const referrerNameMap: Record<string, string> = {}
    referrerProfiles?.forEach(p => {
      referrerNameMap[p.user_id] = p.nome
    })

    // Fetch Stripe subscription details for users with stripe_subscription_id
    const subscriptionDetails: Record<string, any> = {}
    
    for (const profile of profiles || []) {
      if (profile.stripe_subscription_id) {
        try {
          const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
          subscriptionDetails[profile.user_id] = {
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            items: sub.items.data.map(item => ({
              price_id: item.price.id,
              product_id: item.price.product,
              amount: item.price.unit_amount,
              interval: item.price.recurring?.interval
            }))
          }
        } catch (stripeError) {
          console.log(`[Admin Subscriptions] Could not fetch Stripe sub for ${profile.user_id}:`, stripeError)
        }
      }
    }

    // Fetch login fingerprints for all users
    const { data: fingerprints } = await supabaseClient
      .from('user_login_fingerprints')
      .select('user_id, ip_address, user_agent, device_fingerprint, first_seen_at, last_seen_at, login_count')
      .order('last_seen_at', { ascending: false })

    const fingerprintMap: Record<string, any[]> = {}
    fingerprints?.forEach(f => {
      if (!fingerprintMap[f.user_id]) {
        fingerprintMap[f.user_id] = []
      }
      fingerprintMap[f.user_id].push({
        ip_address: f.ip_address,
        user_agent: f.user_agent,
        device_fingerprint: f.device_fingerprint,
        first_seen_at: f.first_seen_at,
        last_seen_at: f.last_seen_at,
        login_count: f.login_count
      })
    })

    // Enrich profiles with all data
    const enrichedUsers = (profiles || []).map(p => {
      const stripeData = subscriptionDetails[p.user_id]
      const referral = referredMap[p.user_id]
      
      // Determine subscription status
      let subscriptionStatus = 'free'
      if (stripeData) {
        if (stripeData.trial_end && new Date(stripeData.trial_end) > new Date()) {
          subscriptionStatus = 'trial'
        } else if (stripeData.cancel_at_period_end) {
          subscriptionStatus = 'cancel_at_period_end'
        } else if (stripeData.status === 'active') {
          subscriptionStatus = 'active'
        } else if (stripeData.status === 'canceled' || stripeData.status === 'cancelled') {
          subscriptionStatus = 'cancelled'
        } else {
          subscriptionStatus = stripeData.status
        }
      } else if (p.subscription_plan && p.subscription_plan !== 'basico') {
        subscriptionStatus = 'active' // Legacy or manual subscription
      }

      // Calculate next billing date
      let nextBillingDate = null
      let currentAmount = 0
      
      if (stripeData?.items?.[0]) {
        currentAmount = stripeData.items[0].amount || 0
        if (stripeData.current_period_end && !stripeData.cancel_at_period_end) {
          nextBillingDate = stripeData.current_period_end
        }
      }

      return {
        user_id: p.user_id,
        nome: p.nome || 'N/A',
        email: emailMap[p.user_id] || 'N/A',
        profissao: p.profissao,
        subscription_plan: p.subscription_plan || 'basico',
        billing_interval: p.billing_interval || (stripeData?.items?.[0]?.interval) || null,
        subscription_status: subscriptionStatus,
        stripe_customer_id: p.stripe_customer_id,
        stripe_subscription_id: p.stripe_subscription_id,
        current_period_start: stripeData?.current_period_start || null,
        current_period_end: stripeData?.current_period_end || null,
        next_billing_date: nextBillingDate,
        current_amount: currentAmount,
        cancel_at_period_end: stripeData?.cancel_at_period_end || false,
        cancel_at: stripeData?.cancel_at || p.subscription_cancel_at,
        trial_end: stripeData?.trial_end || null,
        is_referred: !!referral,
        referrer_name: referral ? referrerNameMap[referral.referrer_id] || 'N/A' : null,
        referrer_id: referral?.referrer_id || null,
        is_referral_partner: p.is_referral_partner,
        referral_code: p.referral_code,
        created_at: p.created_at,
        login_fingerprints: fingerprintMap[p.user_id] || []
      }
    })

    // Apply filters
    let filteredUsers = enrichedUsers

    if (filters.plan && filters.plan !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.subscription_plan === filters.plan)
    }
    if (filters.status && filters.status !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.subscription_status === filters.status)
    }
    if (filters.interval && filters.interval !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.billing_interval === filters.interval)
    }
    if (filters.isReferred === 'yes') {
      filteredUsers = filteredUsers.filter(u => u.is_referred)
    } else if (filters.isReferred === 'no') {
      filteredUsers = filteredUsers.filter(u => !u.is_referred)
    }
    if (filters.isAffiliate === 'yes') {
      filteredUsers = filteredUsers.filter(u => u.is_referral_partner)
    } else if (filters.isAffiliate === 'no') {
      filteredUsers = filteredUsers.filter(u => !u.is_referral_partner)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filteredUsers = filteredUsers.filter(u => 
        u.nome?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
      )
    }

    // Calculate statistics
    const totalUsers = enrichedUsers.length
    const freeUsers = enrichedUsers.filter(u => u.subscription_plan === 'basico' || !u.subscription_plan).length
    const proUsers = enrichedUsers.filter(u => u.subscription_plan === 'pro').length
    const premiumUsers = enrichedUsers.filter(u => u.subscription_plan === 'premium').length
    
    const monthlyUsers = enrichedUsers.filter(u => u.billing_interval === 'month').length
    const annualUsers = enrichedUsers.filter(u => u.billing_interval === 'year').length
    
    const activeSubscriptions = enrichedUsers.filter(u => u.subscription_status === 'active').length
    const trialSubscriptions = enrichedUsers.filter(u => u.subscription_status === 'trial').length
    const cancelingSubscriptions = enrichedUsers.filter(u => u.subscription_status === 'cancel_at_period_end').length
    const cancelledSubscriptions = enrichedUsers.filter(u => u.subscription_status === 'cancelled').length

    // Calculate MRR per plan
    const planPricesMonthly: Record<string, number> = {
      pro: 7990, // R$79.90 in centavos
      premium: 12990 // R$129.90 in centavos
    }
    const planPricesAnnual: Record<string, number> = {
      pro: 6790, // R$67.90/month for annual
      premium: 10990 // R$109.90/month for annual
    }

    let mrrPro = 0
    let mrrPremium = 0
    
    enrichedUsers.filter(u => u.subscription_status === 'active' || u.subscription_status === 'trial').forEach(u => {
      if (u.subscription_plan === 'pro') {
        mrrPro += u.billing_interval === 'year' ? planPricesAnnual.pro : planPricesMonthly.pro
      } else if (u.subscription_plan === 'premium') {
        mrrPremium += u.billing_interval === 'year' ? planPricesAnnual.premium : planPricesMonthly.premium
      }
    })

    const totalMrr = mrrPro + mrrPremium

    // Affiliates and referrals stats
    const activeAffiliates = enrichedUsers.filter(u => u.is_referral_partner).length
    const activeReferred = enrichedUsers.filter(u => u.is_referred && (u.subscription_status === 'active' || u.subscription_status === 'trial')).length

    // Get payout stats
    const { data: payouts } = await supabaseClient
      .from('referral_payouts')
      .select('status, amount')

    const pendingCommissions = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const approvedCommissions = payouts?.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const paidCommissions = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const cancelledCommissions = payouts?.filter(p => p.status === 'cancelled').reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Get fraud signals count
    const { count: fraudSignalsCount } = await supabaseClient
      .from('referral_fraud_signals')
      .select('id', { count: 'exact', head: true })
      .eq('reviewed', false)

    console.log('[Admin Subscriptions Stats] Successfully calculated stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          totalUsers,
          freeUsers,
          proUsers,
          premiumUsers,
          monthlyUsers,
          annualUsers,
          activeSubscriptions,
          trialSubscriptions,
          cancelingSubscriptions,
          cancelledSubscriptions,
          mrrPro: mrrPro / 100,
          mrrPremium: mrrPremium / 100,
          totalMrr: totalMrr / 100,
          activeAffiliates,
          activeReferred,
          pendingCommissions: pendingCommissions / 100,
          approvedCommissions: approvedCommissions / 100,
          paidCommissions: paidCommissions / 100,
          cancelledCommissions: cancelledCommissions / 100,
          fraudSignalsCount: fraudSignalsCount || 0
        },
        users: filteredUsers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Subscriptions Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
