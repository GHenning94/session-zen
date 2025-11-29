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

    const { sessionToken } = await req.json()

    // Verificar sessão de admin
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user_id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar todos os usuários
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('[Admin Get Users] Error:', authError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar perfis
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nome, profissao, subscription_plan, created_at')

    // Combinar dados
    const users = authUsers.users.map(user => {
      const profile = profiles?.find(p => p.user_id === user.id)
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
        confirmed: user.email_confirmed_at !== null,
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