import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { email, password, captchaToken } = await req.json()

    console.log('[Admin Login] Attempt for:', email)

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
          console.error('[Admin Login] Turnstile validation failed, prosseguindo apenas com validação de credenciais.')
        }
      } catch (captchaError) {
        console.error('[Admin Login] Erro ao validar Turnstile, prosseguindo sem CAPTCHA:', captchaError)
      }
    } else {
      console.warn('[Admin Login] Turnstile desativado ou token ausente, prosseguindo sem validação de CAPTCHA.')
    }

    // Validar credenciais de admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')

    if (!adminEmail || !adminPassword) {
      console.error('[Admin Login] Admin credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Credenciais de administrador não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (email !== adminEmail || password !== adminPassword) {
      console.error('[Admin Login] Invalid credentials')
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

    // Extrair apenas o primeiro IP da lista (o IP do cliente real)
    const forwardedFor = req.headers.get('x-forwarded-for')
    const firstIP = forwardedFor 
      ? forwardedFor.split(',')[0].trim()
      : req.headers.get('x-real-ip')
    
    // Validar se é um IP válido, caso contrário usar null
    const clientIP = firstIP && /^[\d.:a-fA-F]+$/.test(firstIP) ? firstIP : null
    const userAgent = req.headers.get('user-agent')

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
      console.error('[Admin Login] Error creating session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log da ação
    await supabase.from('audit_log').insert({
      user_id: adminUserId,
      action: 'ADMIN_LOGIN',
      table_name: 'admin_sessions',
      new_values: { email, ip_address: clientIP },
    })

    console.log('[Admin Login] Success for:', email)

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken,
        userId: adminUserId,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Admin Login] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})