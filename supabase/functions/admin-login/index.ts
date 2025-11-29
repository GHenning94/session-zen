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

    // Validar CAPTCHA do Turnstile
    const turnstileSecret = '0x4AAAAAAB43Um6N9k0oiFBjfJR3TEvx2xt' // Secret key do Turnstile já existente
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
      console.error('[Admin Login] Turnstile validation failed')
      return new Response(
        JSON.stringify({ error: 'Falha na validação do CAPTCHA' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar credenciais de admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')

    if (email !== adminEmail || password !== adminPassword) {
      console.error('[Admin Login] Invalid credentials')
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar usuário no Supabase para obter o ID
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('[Admin Login] Error fetching users:', authError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminUser = authData.users.find(u => u.email === adminEmail)

    if (!adminUser) {
      console.error('[Admin Login] Admin user not found in database')
      return new Response(
        JSON.stringify({ error: 'Usuário admin não encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o usuário tem role de admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      console.error('[Admin Login] User is not an admin')
      return new Response(
        JSON.stringify({ error: 'Usuário não possui permissões de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar sessão de admin
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 horas

    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    const userAgent = req.headers.get('user-agent')

    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        user_id: adminUser.id,
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
      user_id: adminUser.id,
      action: 'ADMIN_LOGIN',
      table_name: 'admin_sessions',
      new_values: { email, ip_address: clientIP },
    })

    console.log('[Admin Login] Success for:', email)

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken,
        userId: adminUser.id,
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