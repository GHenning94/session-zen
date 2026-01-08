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

    console.log('[Admin Referral Stats] Fetching referral data')

    // Get all referrals
    const { data: referrals, error: referralsError } = await supabaseClient
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })

    if (referralsError) throw referralsError

    // Get payouts
    const { data: payouts, error: payoutsError } = await supabaseClient
      .from('referral_payouts')
      .select('*')
      .order('created_at', { ascending: false })

    if (payoutsError) throw payoutsError

    // Get all referral partner profiles (is_referral_partner = true OR left_referral_program_at is not null)
    const { data: partnerProfiles, error: partnersError } = await supabaseClient
      .from('profiles')
      .select('user_id, nome, is_referral_partner, referral_code, left_referral_program_at, stripe_connect_account_id, stripe_connect_onboarded, created_at')
      .or('is_referral_partner.eq.true,left_referral_program_at.not.is.null')
      .order('created_at', { ascending: false })

    if (partnersError) throw partnersError

    // Get user profiles for referrer and referred names
    const allUserIds = [
      ...new Set([
        ...(referrals?.map(r => r.referrer_user_id) || []),
        ...(referrals?.map(r => r.referred_user_id) || [])
      ])
    ]

    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, nome')
      .in('user_id', allUserIds)

    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.user_id] = p
      return acc
    }, {})

    // Enrich referrals with names
    const enrichedReferrals = referrals?.map(r => ({
      ...r,
      referrer_name: profilesMap[r.referrer_user_id]?.nome || 'Usuário',
      referred_name: profilesMap[r.referred_user_id]?.nome || 'Usuário'
    })) || []

    // Calculate cooldown status for partners
    const now = new Date()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    
    const enrichedPartners = partnerProfiles?.map(p => {
      let cooldownStatus = 'none'
      let cooldownEndDate = null
      let daysRemaining = null
      
      if (p.left_referral_program_at) {
        const leftDate = new Date(p.left_referral_program_at)
        const cooldownEnd = new Date(leftDate.getTime() + thirtyDaysMs)
        cooldownEndDate = cooldownEnd.toISOString()
        
        if (cooldownEnd > now) {
          cooldownStatus = 'active'
          daysRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        } else {
          cooldownStatus = 'expired'
        }
      }
      
      // Count referrals for this partner
      const partnerReferrals = referrals?.filter(r => r.referrer_user_id === p.user_id) || []
      const activePartnerReferrals = partnerReferrals.filter(r => r.status === 'active')
      const totalCommissionEarned = partnerReferrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0)
      
      return {
        ...p,
        status: p.is_referral_partner ? 'active' : (cooldownStatus === 'active' ? 'cooldown' : 'inactive'),
        cooldown_status: cooldownStatus,
        cooldown_end_date: cooldownEndDate,
        days_remaining: daysRemaining,
        total_referrals: partnerReferrals.length,
        active_referrals: activePartnerReferrals.length,
        total_commission_earned: totalCommissionEarned / 100
      }
    }) || []

    // Calculate stats
    const activeReferrers = partnerProfiles?.filter(p => p.is_referral_partner).length || 0
    const inCooldown = enrichedPartners.filter(p => p.cooldown_status === 'active').length
    const inactivePartners = enrichedPartners.filter(p => p.status === 'inactive').length
    const totalReferred = referrals?.length || 0
    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0
    const conversionRate = totalReferred > 0 ? (activeReferrals / totalReferred) * 100 : 0

    // Calculate MRR from referrals (only active ones)
    const planPrices = {
      pro: 79.90,
      premium: 129.90
    }

    let referralMrr = 0
    referrals?.filter(r => r.status === 'active').forEach(r => {
      const plan = r.subscription_plan as keyof typeof planPrices
      if (planPrices[plan]) {
        referralMrr += planPrices[plan]
      }
    })

    // Calculate commissions
    const totalCommission = referrals?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0
    const paidCommission = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const pendingCommission = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    console.log('[Admin Referral Stats] Successfully calculated referral stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          activeReferrers,
          inCooldown,
          inactivePartners,
          totalPartners: partnerProfiles?.length || 0,
          totalReferred,
          activeReferrals,
          conversionRate,
          referralMrr,
          totalCommission: totalCommission / 100,
          paidCommission: paidCommission / 100,
          pendingCommission: pendingCommission / 100,
          totalPayouts: payouts?.length || 0
        },
        referrals: enrichedReferrals,
        partners: enrichedPartners,
        payouts: payouts?.map(p => ({
          ...p,
          partner_name: profilesMap[p.user_id]?.nome || 'Usuário'
        })) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Referral Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
