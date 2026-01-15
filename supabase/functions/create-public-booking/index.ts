import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const clientDataSchema = z.object({
  nome: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255).trim().toLowerCase(),
  telefone: z.string().max(20).regex(/^[\d\s\+\-\(\)]*$/).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
})

const sessionDataSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  horario: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), // HH:MM or HH:MM:SS format
})

const bookingSchema = z.object({
  slug: z.string().min(1).max(100),
  clientData: clientDataSchema,
  sessionData: sessionDataSchema,
})

// Helper function to format time as HH:MM:SS for PostgreSQL
function formatTimeForDatabase(time: string): string {
  if (!time) return time
  const colonCount = (time.match(/:/g) || []).length
  return colonCount === 1 ? `${time}:00` : time
}

// Sanitize and validate IP address
function sanitizeIP(rawIp: string): string {
  const clientIp = (rawIp.split(',')[0] || '').trim()
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^(::1|[a-fA-F0-9:]+)$/
  
  if (ipv4Regex.test(clientIp) || ipv6Regex.test(clientIp)) {
    return clientIp
  }
  return '0.0.0.0'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Rate limiting check with safe IP parsing
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const safeIp = sanitizeIP(rawIp)
    
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: safeIp,
      p_endpoint: 'create-public-booking',
      p_max_requests: 3,
      p_window_minutes: 1
    })

    if (rateLimitError) {
      console.log('[CREATE-BOOKING] Rate limit check error, allowing request')
    } else if (!rateLimitCheck) {
      console.log('[CREATE-BOOKING] Rate limit exceeded')
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Aguarde um momento antes de tentar novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate input
    const rawBody = await req.json()
    const parseResult = bookingSchema.safeParse(rawBody)

    if (!parseResult.success) {
      console.log('[CREATE-BOOKING] Validation failed:', parseResult.error.issues.map(i => i.path.join('.')))
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando ou inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { slug, clientData, sessionData } = parseResult.data

    // Buscar configurações do terapeuta através do slug
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('user_id, booking_enabled, valor_padrao')
      .eq('slug', slug)
      .eq('booking_enabled', true)
      .single()

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configuração de agendamento não encontrada ou desabilitada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se já existe uma sessão neste horário
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', config.user_id)
      .eq('data', sessionData.data)
      .eq('horario', formatTimeForDatabase(sessionData.horario))
      .single()

    if (existingSession) {
      return new Response(
        JSON.stringify({ error: 'Horário já está ocupado' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Data is already validated and sanitized by Zod
    const sanitizedClientData = {
      nome: clientData.nome,
      email: clientData.email,
      telefone: clientData.telefone || null,
      dados_clinicos: clientData.observacoes || null
    }

    // Criar cliente com user_id seguro (do terapeuta encontrado via slug)
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert([{
        user_id: config.user_id,
        ...sanitizedClientData
      }])
      .select('id')
      .single()

    if (clientError || !newClient) {
      console.error('[CREATE-BOOKING] Client creation failed')
      return new Response(
        JSON.stringify({ error: 'Erro ao criar cliente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar sessão
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        user_id: config.user_id,
        client_id: newClient.id,
        data: sessionData.data,
        horario: formatTimeForDatabase(sessionData.horario),
        status: 'agendada',
        valor: config.valor_padrao || 0
      }])
      .select()
      .single()

    if (sessionError) {
      console.error('[CREATE-BOOKING] Session creation failed')
      // Reverter criação do cliente se a sessão falhar
      await supabase.from('clients').delete().eq('id', newClient.id)
      
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification for professional about new booking
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: config.user_id,
        titulo: 'Nova sessão agendada',
        conteudo: `${sanitizedClientData.nome} agendou uma sessão para ${sessionData.data} às ${sessionData.horario}`,
        data: new Date().toISOString(),
        lida: false
      })

    if (notifError) {
      console.log('[CREATE-BOOKING] Notification creation failed (non-critical)')
    } else {
      // Send Web Push notification
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        
        await fetch(`${supabaseUrl}/functions/v1/push-broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            user_id: config.user_id,
            title: 'Nova sessão agendada',
            body: `${sanitizedClientData.nome} agendou para ${sessionData.data} às ${sessionData.horario}`,
            url: '/agenda',
            tag: 'new-session',
          }),
        })
      } catch (pushError) {
        console.log('[CREATE-BOOKING] Push notification failed (non-critical)')
      }
    }

    // Send email notification to professional about new booking (non-blocking)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      
      await fetch(`${supabaseUrl}/functions/v1/send-new-booking-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userId: config.user_id,
          sessionId: newSession.id,
          clientId: newClient.id,
          clientName: sanitizedClientData.nome,
          sessionDate: sessionData.data,
          sessionTime: sessionData.horario
        }),
      })
    } catch (emailError) {
      console.log('[CREATE-BOOKING] Email notification failed (non-critical)')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Agendamento realizado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CREATE-BOOKING] Unexpected error')
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
