import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// Allowed origins for admin panel
const ALLOWED_ORIGINS = [
  'https://therapypro.app.br',
  'https://www.therapypro.app.br',
  'https://ykwszazxigjivjkagjmf.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

// Session token validation schema
const sessionTokenSchema = z.string().uuid()

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

    // Validate session token format
    const tokenValidation = sessionTokenSchema.safeParse(sessionToken)
    if (!tokenValidation.success) {
      return new Response(
        JSON.stringify({ error: 'Token de sessão inválido', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar sessão
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('id, user_id, expires_at, revoked')
      .eq('session_token', tokenValidation.data)
      .eq('revoked', false)
      .single()

    if (sessionError || !session) {
      console.log('[Admin Verify] Session not found')
      return new Response(
        JSON.stringify({ error: 'Sessão inválida', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar expiração
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now >= expiresAt) {
      console.log('[Admin Verify] Session expired')
      
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

    // Return minimal info - don't expose userId
    return new Response(
      JSON.stringify({
        valid: true,
        expiresAt: session.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Admin Verify] Unexpected error')
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
