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

    console.log('[Admin Clients Stats] Fetching clients data')

    // Get all clients
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id, nome, email, telefone, ativo, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (clientsError) throw clientsError

    // Get user profiles
    const userIds = [...new Set(clients?.map(c => c.user_id) || [])]
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

    // Get sessions count per client
    const clientIds = clients?.map(c => c.id) || []
    const { data: sessionsCounts } = await supabaseClient
      .from('sessions')
      .select('client_id, data')
      .in('client_id', clientIds)
      .order('data', { ascending: false })

    // Count sessions per client
    const sessionsCountMap: Record<string, { count: number; lastSession: string | null }> = {}
    sessionsCounts?.forEach(s => {
      if (!sessionsCountMap[s.client_id]) {
        sessionsCountMap[s.client_id] = { count: 0, lastSession: s.data }
      }
      sessionsCountMap[s.client_id].count++
    })

    // Enrich clients
    const enrichedClients = clients?.map(c => ({
      ...c,
      user_name: profilesMap[c.user_id]?.nome || 'Usuário',
      user_email: usersMap[c.user_id]?.email || '',
      sessions_count: sessionsCountMap[c.id]?.count || 0,
      last_session: sessionsCountMap[c.id]?.lastSession || null
    })) || []

    // Calculate stats
    const totalClients = enrichedClients.length
    const activeClients = enrichedClients.filter(c => c.ativo).length
    const inactiveClients = enrichedClients.filter(c => !c.ativo).length
    const totalSessionsCount = enrichedClients.reduce((sum, c) => sum + c.sessions_count, 0)
    const avgSessionsPerClient = totalClients > 0 ? totalSessionsCount / totalClients : 0

    console.log('[Admin Clients Stats] Successfully calculated clients stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        totalClients,
        activeClients,
        inactiveClients,
        avgSessionsPerClient,
        clients: enrichedClients
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Clients Stats] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
