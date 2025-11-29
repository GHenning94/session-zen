import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get session token from body
    const { sessionToken } = await req.json()
    
    if (!sessionToken) {
      throw new Error('No session token provided')
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
      throw new Error('Invalid or expired admin session')
    }

    // Get payments data with user and client info
    const { data: payments, error: paymentsError } = await supabaseClient
      .from('payments')
      .select(`
        *,
        client:clients(nome, email),
        user:profiles!payments_user_id_fkey(nome, email)
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (paymentsError) throw paymentsError

    // Calculate statistics
    const stats = {
      total_revenue: payments?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0,
      paid_count: payments?.filter(p => p.status === 'pago').length || 0,
      pending_count: payments?.filter(p => p.status === 'pendente').length || 0,
      overdue_count: payments?.filter(p => 
        p.status === 'pendente' && 
        p.data_vencimento && 
        new Date(p.data_vencimento) < new Date()
      ).length || 0,
      average_value: payments?.length ? 
        (payments.reduce((sum, p) => sum + (p.valor || 0), 0) / payments.length) : 0,
    }

    // Group by payment method
    const by_method = payments?.reduce((acc: any, p) => {
      const method = p.metodo_pagamento || 'Não definido'
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 }
      }
      acc[method].count++
      acc[method].total += p.valor || 0
      return acc
    }, {})

    console.log('Payments data retrieved successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        payments,
        stats,
        by_method 
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