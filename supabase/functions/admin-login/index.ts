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

// Input validation schema
const loginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(1).max(128),
  captchaToken: z.string().max(2048).optional(),
})

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Hash IP address for logging (privacy-preserving)
async function hashIP(ip: string): Promise<string> {
  if (!ip) return 'unknown'
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 16))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Validate and sanitize IP address
function sanitizeIP(forwardedFor: string | null, realIp: string | null): string | null {
  const rawIP = forwardedFor?.split(',')[0]?.trim() || realIp?.trim()
  if (!rawIP) return null
  
  // Validate IPv4 or IPv6 format
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([a-fA-F0-9]{0,4}:){2,7}[a-fA-F0-9]{0,4}$/
  
  if (ipv4Regex.test(rawIP) || ipv6Regex.test(rawIP)) {
    return rawIP
  }
  return null
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

    // Parse and validate input
    const rawBody = await req.json()
    const parseResult = loginSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      console.log('[Admin Login] Validation failed:', parseResult.error.issues)
      return new Response(
        JSON.stringify({ error: 'Dados de entrada inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, captchaToken } = parseResult.data

    console.log('[Admin Login] Attempt received')

    // Validar CAPTCHA do Turnstile (modo tolerante - não bloqueia login se falhar)
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')

    if (turnstileSecret && captchaToken) {
      try {
        const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: captchaToken,
          }),
        })

        const turnstileData = await turnstileResponse.json()

        if (!turnstileData.success) {
          console.log('[Admin Login] Turnstile validation failed, continuing with credential check')
        }
      } catch (captchaError) {
        console.log('[Admin Login] Turnstile error, continuing without CAPTCHA')
      }
    }

    // Validar credenciais de admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')

    if (!adminEmail || !adminPassword) {
      console.error('[Admin Login] Admin credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Configuração de servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use constant-time comparison to prevent timing attacks
    const encoder = new TextEncoder();
    const maxLen = 256;
    
    const emailBytes = encoder.encode((email || '').padEnd(maxLen, '\0').slice(0, maxLen));
    const adminEmailBytes = encoder.encode((adminEmail || '').padEnd(maxLen, '\0').slice(0, maxLen));
    const passwordBytes = encoder.encode((password || '').padEnd(maxLen, '\0').slice(0, maxLen));
    const adminPasswordBytes = encoder.encode((adminPassword || '').padEnd(maxLen, '\0').slice(0, maxLen));

    // Constant-time comparison using XOR
    let emailMatch = 0;
    let passwordMatch = 0;
    for (let i = 0; i < maxLen; i++) {
      emailMatch |= emailBytes[i] ^ adminEmailBytes[i];
      passwordMatch |= passwordBytes[i] ^ adminPasswordBytes[i];
    }

    const credentialsValid = emailMatch === 0 && passwordMatch === 0;

    if (!credentialsValid) {
      // Add artificial delay to prevent timing analysis
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
      
      console.log('[Admin Login] Invalid credentials attempt')
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar ID único para esta sessão admin (não depende de auth.users)
    const adminUserId = crypto.randomUUID()
    
    // Criar sessão de admin
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 horas

    // Sanitize and validate IP
    const clientIP = sanitizeIP(
      req.headers.get('x-forwarded-for'),
      req.headers.get('x-real-ip')
    )
    
    // Truncate user agent for storage
    const userAgent = req.headers.get('user-agent')?.substring(0, 500) || null

    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        user_id: adminUserId,
        session_token: sessionToken,
        ip_address: clientIP,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      console.error('[Admin Login] Session creation error')
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log with hashed IP for privacy
    const hashedIP = await hashIP(clientIP || '')
    await supabase.from('audit_log').insert({
      user_id: adminUserId,
      action: 'ADMIN_LOGIN',
      table_name: 'admin_sessions',
      new_values: { ip_hash: hashedIP },
    })

    console.log('[Admin Login] Session created successfully')

    // Return minimal session info
    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: sessionToken,
        expiresAt: expiresAt.toISOString(),
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    )

  } catch (error) {
    console.error('[Admin Login] Unexpected error')
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
