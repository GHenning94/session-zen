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

    // Get session token from header
    const sessionToken = req.headers.get('X-Admin-Session')
    
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

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const userId = url.searchParams.get('user_id')

    // Build query for bank details audit logs
    let query = supabaseClient
      .from('bank_details_audit_log')
      .select(`
        id,
        user_id,
        action,
        old_values,
        new_values,
        changed_fields,
        ip_address,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: bankAuditLogs, error: logsError } = await query

    if (logsError) throw logsError

    // Get user names for the logs
    const userIds = [...new Set(bankAuditLogs?.map(log => log.user_id) || [])]
    
    let userNames: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id, nome')
        .in('user_id', userIds)
      
      if (profiles) {
        userNames = profiles.reduce((acc: Record<string, string>, p) => {
          acc[p.user_id] = p.nome || 'Usuário'
          return acc
        }, {})
      }
    }

    // Enrich logs with user names
    const enrichedLogs = bankAuditLogs?.map(log => ({
      ...log,
      user_name: userNames[log.user_id] || 'Desconhecido'
    })) || []

    // Calculate statistics
    const stats = {
      total_changes: enrichedLogs.length,
      unique_users: userIds.length,
      changes_last_24h: enrichedLogs.filter(
        log => new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      changes_last_7d: enrichedLogs.filter(
        log => new Date(log.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    }

    // Get field change frequency
    const fieldCounts: Record<string, number> = {}
    enrichedLogs.forEach(log => {
      log.changed_fields?.forEach((field: string) => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1
      })
    })

    console.log(`Bank audit logs retrieved: ${enrichedLogs.length} records`)

    return new Response(
      JSON.stringify({ 
        success: true,
        logs: enrichedLogs,
        stats,
        field_counts: fieldCounts
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
