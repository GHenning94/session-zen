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

// Parse cookies from request header
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=')
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim()
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

    // Get session token from X-Admin-Session header first, then cookie, then body
    let sessionToken = req.headers.get('X-Admin-Session')
    
    // Fallback to cookie
    if (!sessionToken) {
      const cookies = parseCookies(req.headers.get('cookie'))
      sessionToken = cookies['admin_session']
    }
    
    // Fallback to body for backward compatibility
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
      } catch {
        // No body or invalid JSON
      }
    }

    if (!sessionToken) {
      console.error('[Admin Get Users] No session token')
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar sessão de admin
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .maybeSingle()

    if (sessionError || !session) {
      console.error('[Admin Get Users] Invalid session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      console.error('[Admin Get Users] Session expired')
      return new Response(
        JSON.stringify({ error: 'Sessão expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Admin Get Users] Session valid, fetching users')

    // Buscar todos os usuários
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('[Admin Get Users] Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar perfis
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nome, profissao, subscription_plan, created_at, email_confirmed_strict')

    // Combinar dados
    const users = authUsers.users.map(user => {
      const profile = profiles?.find(p => p.user_id === user.id)
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
        confirmed: user.email_confirmed_at !== null || profile?.email_confirmed_strict === true,
        banned: user.banned_until !== null,
        nome: profile?.nome || 'Sem nome',
        profissao: profile?.profissao || 'Não informado',
        subscription_plan: profile?.subscription_plan || 'basico',
      }
    })

    // Log da ação
    await supabase.from('audit_log').insert({
      user_id: session.user_id,
      action: 'ADMIN_VIEW_USERS',
      table_name: 'auth.users',
      new_values: { count: users.length },
    })

    console.log('[Admin Get Users] Returning', users.length, 'users')

    return new Response(
      JSON.stringify({ success: true, users }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Admin Get Users] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
