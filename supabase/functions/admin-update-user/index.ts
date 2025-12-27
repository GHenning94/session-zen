import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
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

    // Get session token from header or body
    let sessionToken = req.headers.get('X-Admin-Session')
    let body: any = {}
    
    try {
      body = await req.clone().json()
      if (!sessionToken) {
        sessionToken = body.sessionToken
      }
    } catch {
      // Body parsing failed
    }

    if (!sessionToken) {
      throw new Error('No admin session token provided')
    }

    // Verify admin session - session only exists if login was done with correct credentials
    const { data: session, error: sessionError } = await supabaseClient
      .from('admin_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      console.log('[Admin Update User] Session not found or expired:', sessionError?.message)
      throw new Error('Invalid or expired admin session')
    }


    const { user_id, action } = body

    if (!user_id || !action) {
      throw new Error('Missing required fields')
    }

    let result

    switch (action) {
      case 'block':
        // Ban user
        result = await supabaseClient.auth.admin.updateUserById(user_id, {
          ban_duration: 'none', // Permanent ban
        })
        
        // Log action
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'USER_BLOCKED',
          table_name: 'auth.users',
          record_id: user_id,
          new_values: { blocked: true },
        })
        break

      case 'unblock':
        // Unban user
        result = await supabaseClient.auth.admin.updateUserById(user_id, {
          ban_duration: '0s',
        })
        
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'USER_UNBLOCKED',
          table_name: 'auth.users',
          record_id: user_id,
          new_values: { blocked: false },
        })
        break

      case 'delete':
        // Delete user account
        result = await supabaseClient.auth.admin.deleteUser(user_id)
        
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'USER_DELETED',
          table_name: 'auth.users',
          record_id: user_id,
        })
        break

      default:
        throw new Error('Invalid action')
    }

    if (result.error) throw result.error

    console.log(`User ${action} completed successfully`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `User ${action} completed successfully`
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