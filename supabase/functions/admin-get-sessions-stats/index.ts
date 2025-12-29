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

    console.log('[Admin Sessions Stats] Fetching sessions data for period:', period)

    const periodDate = new Date()
    periodDate.setDate(periodDate.getDate() - period)

    // Get sessions with related data
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('sessions')
      .select(`
        id,
        data,
        horario,
        status,
        valor,
        client_id,
        user_id,
        created_at
      `)
      .gte('created_at', periodDate.toISOString())
      .order('data', { ascending: false })
      .limit(500)

    if (sessionsError) throw sessionsError

    // Get clients for names
    const clientIds = [...new Set(sessions?.map(s => s.client_id) || [])]
    const { data: clients } = await supabaseClient
      .from('clients')
      .select('id, nome')
      .in('id', clientIds)

    const clientsMap = (clients || []).reduce((acc: any, c: any) => {
      acc[c.id] = c
      return acc
    }, {})

    // Get user profiles
    const userIds = [...new Set(sessions?.map(s => s.user_id) || [])]
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, nome')
      .in('user_id', userIds)

    // Get user emails from auth
    const { data: { users } } = await supabaseClient.auth.admin.listUsers()
    const usersMap = (users || []).reduce((acc: any, u: any) => {
      acc[u.id] = u
      return acc
    }, {})

    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.user_id] = p
      return acc
    }, {})

    // Enrich sessions
    const enrichedSessions = sessions?.map(s => ({
      ...s,
      client_name: clientsMap[s.client_id]?.nome || 'Cliente não encontrado',
      user_name: profilesMap[s.user_id]?.nome || 'Usuário',
      user_email: usersMap[s.user_id]?.email || ''
    })) || []

    // Calculate stats
    const totalSessions = enrichedSessions.length
    const completedSessions = enrichedSessions.filter(s => s.status === 'realizada').length
    const cancelledSessions = enrichedSessions.filter(s => s.status === 'cancelada').length
    const scheduledSessions = enrichedSessions.filter(s => s.status === 'agendada').length

    // Unique users and clients
    const uniqueUsers = new Set(enrichedSessions.map(s => s.user_id)).size
    const uniqueClients = new Set(enrichedSessions.map(s => s.client_id)).size

    const avgSessionsPerUser = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0
    const avgSessionsPerClient = uniqueClients > 0 ? totalSessions / uniqueClients : 0

    console.log('[Admin Sessions Stats] Successfully calculated sessions stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        totalSessions,
        completedSessions,
        cancelledSessions,
        scheduledSessions,
        avgSessionsPerUser,
        avgSessionsPerClient,
        sessions: enrichedSessions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Sessions Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
