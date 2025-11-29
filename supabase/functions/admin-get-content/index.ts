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

    // Verify admin session from token
    const authHeader = req.headers.get('x-admin-token')
    if (!authHeader) {
      throw new Error('No admin token provided')
    }

    const { data: sessionData, error: sessionError } = await supabaseClient.functions.invoke('admin-verify-session', {
      body: { sessionToken: authHeader }
    })
    
    if (sessionError || !sessionData.valid) {
      throw new Error('Invalid admin session')
    }

    // Get public pages data
    const { data: pages, error: pagesError } = await supabaseClient
      .from('configuracoes')
      .select(`
        user_id,
        slug,
        booking_enabled,
        page_title,
        page_description,
        brand_color,
        created_at,
        updated_at,
        profile:profiles!configuracoes_user_id_fkey(nome, email)
      `)
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })

    if (pagesError) throw pagesError

    // Get events data
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select(`
        *,
        profile:profiles!events_user_id_fkey(nome, email)
      `)
      .eq('is_public', true)
      .order('event_date', { ascending: false })
      .limit(100)

    if (eventsError) throw eventsError

    // Get record templates
    const { data: templates, error: templatesError } = await supabaseClient
      .from('record_templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (templatesError) throw templatesError

    const stats = {
      total_pages: pages?.length || 0,
      active_pages: pages?.filter(p => p.booking_enabled).length || 0,
      total_events: events?.length || 0,
      total_templates: templates?.length || 0,
    }

    console.log('Content data retrieved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        pages,
        events,
        templates,
        stats
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