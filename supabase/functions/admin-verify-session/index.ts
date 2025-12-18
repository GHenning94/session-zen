import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to get session token from cookie first, then from body (for backward compatibility)
    const cookies = parseCookies(req.headers.get('cookie'))
    let sessionToken = cookies['admin_session']
    
    // Fallback to body for backward compatibility during transition
    if (!sessionToken) {
      try {
        const body = await req.json()
        sessionToken = body.sessionToken
      } catch {
        // No body or invalid JSON
      }
    }

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Token de sessão não fornecido', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar sessão
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .single()

    if (sessionError || !session) {
      console.error('[Admin Verify] Session not found')
      return new Response(
        JSON.stringify({ error: 'Sessão inválida', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar expiração
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now >= expiresAt) {
      console.error('[Admin Verify] Session expired')
      
      // Revogar sessão expirada
      await supabase
        .from('admin_sessions')
        .update({ revoked: true, revoked_at: now.toISOString() })
        .eq('id', session.id)

      // Clear the cookie
      return new Response(
        JSON.stringify({ error: 'Sessão expirada', valid: false }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
          } 
        }
      )
    }

    // Sessão válida - não precisa verificar role pois sessões admin são criadas apenas no login

    console.log('[Admin Verify] Session valid for user:', session.user_id)

    return new Response(
      JSON.stringify({
        valid: true,
        userId: session.user_id,
        expiresAt: session.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Admin Verify] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})