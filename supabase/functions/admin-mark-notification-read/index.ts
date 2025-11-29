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

    const { notification_id, mark_all } = await req.json()

    if (mark_all) {
      // Mark all as read
      const { error: updateError } = await supabaseClient
        .from('admin_notifications')
        .update({ read: true })
        .eq('read', false)

      if (updateError) throw updateError

      console.log('All notifications marked as read')
    } else if (notification_id) {
      // Mark single notification as read
      const { error: updateError } = await supabaseClient
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', notification_id)

      if (updateError) throw updateError

      console.log(`Notification ${notification_id} marked as read`)
    } else {
      throw new Error('Either notification_id or mark_all must be provided')
    }

    return new Response(
      JSON.stringify({ success: true }),
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
