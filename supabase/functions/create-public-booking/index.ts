import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const clientIp = (rawIp.split(',')[0] || '').trim();
    const safeIp = clientIp && /^(\d{1,3}\.){3}\d{1,3}$|^::1$|^[a-fA-F0-9:]+$/.test(clientIp) ? clientIp : '0.0.0.0';
    
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip: safeIp,
      p_endpoint: 'create-public-booking',
      p_max_requests: 3,
      p_window_minutes: 1
    });

    if (rateLimitError) {
      console.log('[CREATE-BOOKING] Rate limit check error, allowing request:', rateLimitError);
    } else if (!rateLimitCheck) {
      console.log('[CREATE-BOOKING] Rate limit exceeded for IP:', safeIp);
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Aguarde um momento antes de tentar novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { slug, clientData, sessionData } = await req.json()

    // Validar entrada
    if (!slug || !clientData?.nome || !clientData?.email || !sessionData?.data || !sessionData?.horario) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      .eq('horario', sessionData.horario)
      .single()

    if (existingSession) {
      return new Response(
        JSON.stringify({ error: 'Horário já está ocupado' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitizar dados do cliente (remover caracteres perigosos)
    const sanitizedClientData = {
      nome: clientData.nome.trim().substring(0, 100),
      email: clientData.email.trim().toLowerCase().substring(0, 100),
      telefone: clientData.telefone?.trim().substring(0, 20) || null,
      dados_clinicos: clientData.observacoes?.trim().substring(0, 500) || null
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedClientData.email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente com user_id seguro (do terapeuta encontrado via slug)
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert([{
        user_id: config.user_id, // Sempre usar o user_id do terapeuta autenticado
        ...sanitizedClientData
      }])
      .select('id')
      .single()

    if (clientError || !newClient) {
      console.error('Erro ao criar cliente:', clientError)
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
        horario: sessionData.horario,
        status: 'agendada',
        valor: config.valor_padrao || 0
      }])
      .select()
      .single()

    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError)
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
      console.error('Erro ao criar notificação:', notifError)
    } else {
      console.log('Notificação criada para profissional sobre novo agendamento')
      
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
        console.log('[create-booking] Web Push sent')
      } catch (pushError) {
        console.error('[create-booking] Error sending Web Push:', pushError)
        // Non-critical, continue
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Agendamento realizado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})