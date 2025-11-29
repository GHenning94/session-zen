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

    // Verify admin session
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: adminUser }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !adminUser) {
      throw new Error('Invalid session')
    }

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .single()

    if (!roles) {
      throw new Error('Unauthorized: Admin access required')
    }

    const { user_id, action } = await req.json()

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
          user_id: adminUser.id,
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
          user_id: adminUser.id,
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
          user_id: adminUser.id,
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