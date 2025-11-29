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

    // Get database analytics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [usersCount, sessionsCount, paymentsCount, clientsCount] = await Promise.all([
      supabaseClient.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseClient.from('sessions').select('id', { count: 'exact', head: true }),
      supabaseClient.from('payments').select('id', { count: 'exact', head: true }),
      supabaseClient.from('clients').select('id', { count: 'exact', head: true }),
    ])

    // Get recent activity
    const { data: recentUsers } = await supabaseClient
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    const { data: recentSessions } = await supabaseClient
      .from('sessions')
      .select('created_at, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    const { data: recentPayments } = await supabaseClient
      .from('payments')
      .select('created_at, valor, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Calculate growth trends
    const usersGrowth = recentUsers?.length || 0
    const sessionsCompleted = recentSessions?.filter(s => s.status === 'realizada').length || 0
    const revenue = recentPayments?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0

    console.log('Analytics data retrieved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        ga_property_id: 'G-KB3SCVSH9B',
        database_stats: {
          total_users: usersCount.count || 0,
          total_sessions: sessionsCount.count || 0,
          total_payments: paymentsCount.count || 0,
          total_clients: clientsCount.count || 0,
        },
        recent_activity: {
          new_users_30d: usersGrowth,
          sessions_completed_30d: sessionsCompleted,
          revenue_30d: revenue,
        },
        trends: {
          users: recentUsers?.map(u => ({
            date: new Date(u.created_at).toISOString().split('T')[0],
          })) || [],
          sessions: recentSessions?.map(s => ({
            date: new Date(s.created_at).toISOString().split('T')[0],
            status: s.status,
          })) || [],
          revenue: recentPayments?.map(p => ({
            date: new Date(p.created_at).toISOString().split('T')[0],
            value: p.valor,
          })) || [],
        }
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