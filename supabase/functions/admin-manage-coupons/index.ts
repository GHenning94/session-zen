import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

interface CouponData {
  user_id?: string;
  user_ids?: string[];
  code: string;
  discount: string;
  description: string;
  coupon_type?: string;
  expires_at?: string;
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
      console.log('[Admin Manage Coupons] No session token provided')
      throw new Error('No admin session token provided')
    }

    // Verify admin session
    const { data: session, error: sessionError } = await supabaseClient
      .from('admin_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      console.log('[Admin Manage Coupons] Session not found or expired:', sessionError?.message)
      throw new Error('Invalid or expired admin session')
    }

    const { action } = body

    if (!action) {
      throw new Error('Missing action field')
    }

    console.log(`[Admin Manage Coupons] Processing action: ${action}`)

    let result: any = { success: true }

    switch (action) {
      case 'add_single': {
        // Add coupon to a single user
        const { user_id, code, discount, description, coupon_type, expires_at } = body as CouponData
        
        if (!user_id || !code || !discount || !description) {
          throw new Error('Missing required fields: user_id, code, discount, description')
        }

        const { data, error } = await supabaseClient
          .from('user_coupons')
          .insert({
            user_id,
            code,
            discount,
            description,
            coupon_type: coupon_type || 'promotional',
            expires_at: expires_at || null,
          })
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            throw new Error(`User already has coupon with code: ${code}`)
          }
          throw error
        }

        // Log action
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'COUPON_ADDED',
          table_name: 'user_coupons',
          record_id: data.id,
          new_values: { user_id, code, discount },
        })

        console.log(`[Admin Manage Coupons] Coupon ${code} added to user ${user_id}`)
        result = { success: true, coupon: data, message: `Coupon ${code} added successfully` }
        break
      }

      case 'add_batch': {
        // Add coupon to multiple users
        const { user_ids, code, discount, description, coupon_type, expires_at } = body as CouponData
        
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
          throw new Error('Missing or invalid user_ids array')
        }
        if (!code || !discount || !description) {
          throw new Error('Missing required fields: code, discount, description')
        }

        const couponsToInsert = user_ids.map(uid => ({
          user_id: uid,
          code,
          discount,
          description,
          coupon_type: coupon_type || 'promotional',
          expires_at: expires_at || null,
        }))

        const { data, error } = await supabaseClient
          .from('user_coupons')
          .upsert(couponsToInsert, { 
            onConflict: 'user_id,code',
            ignoreDuplicates: true 
          })
          .select()

        if (error) throw error

        // Log action
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'COUPONS_BATCH_ADDED',
          table_name: 'user_coupons',
          new_values: { code, discount, user_count: user_ids.length },
        })

        console.log(`[Admin Manage Coupons] Coupon ${code} added to ${user_ids.length} users`)
        result = { 
          success: true, 
          coupons: data, 
          message: `Coupon ${code} added to ${data?.length || 0} users` 
        }
        break
      }

      case 'add_to_all': {
        // Add coupon to all users
        const { code, discount, description, coupon_type, expires_at, filter_plan } = body
        
        if (!code || !discount || !description) {
          throw new Error('Missing required fields: code, discount, description')
        }

        // Get all user IDs (optionally filter by plan)
        let query = supabaseClient
          .from('profiles')
          .select('user_id')
        
        if (filter_plan) {
          query = query.eq('subscription_plan', filter_plan)
        }

        const { data: profiles, error: profilesError } = await query

        if (profilesError) throw profilesError

        if (!profiles || profiles.length === 0) {
          throw new Error('No users found matching criteria')
        }

        const couponsToInsert = profiles.map(p => ({
          user_id: p.user_id,
          code,
          discount,
          description,
          coupon_type: coupon_type || 'promotional',
          expires_at: expires_at || null,
        }))

        const { data, error } = await supabaseClient
          .from('user_coupons')
          .upsert(couponsToInsert, { 
            onConflict: 'user_id,code',
            ignoreDuplicates: true 
          })
          .select()

        if (error) throw error

        // Log action
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'COUPONS_MASS_ADDED',
          table_name: 'user_coupons',
          new_values: { code, discount, user_count: profiles.length, filter_plan },
        })

        console.log(`[Admin Manage Coupons] Coupon ${code} added to all ${profiles.length} users`)
        result = { 
          success: true, 
          message: `Coupon ${code} added to ${data?.length || 0} users` 
        }
        break
      }

      case 'delete': {
        // Delete a specific coupon
        const { coupon_id } = body
        
        if (!coupon_id) {
          throw new Error('Missing coupon_id')
        }

        const { error } = await supabaseClient
          .from('user_coupons')
          .delete()
          .eq('id', coupon_id)

        if (error) throw error

        // Log action
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'COUPON_DELETED',
          table_name: 'user_coupons',
          record_id: coupon_id,
        })

        console.log(`[Admin Manage Coupons] Coupon ${coupon_id} deleted`)
        result = { success: true, message: 'Coupon deleted successfully' }
        break
      }

      case 'delete_by_code': {
        // Delete all coupons with a specific code
        const { code } = body
        
        if (!code) {
          throw new Error('Missing code')
        }

        const { data, error } = await supabaseClient
          .from('user_coupons')
          .delete()
          .eq('code', code)
          .select()

        if (error) throw error

        // Log action
        await supabaseClient.from('audit_log').insert({
          user_id: session.user_id,
          action: 'COUPONS_CODE_DELETED',
          table_name: 'user_coupons',
          new_values: { code, deleted_count: data?.length || 0 },
        })

        console.log(`[Admin Manage Coupons] All coupons with code ${code} deleted (${data?.length || 0} coupons)`)
        result = { success: true, message: `${data?.length || 0} coupons deleted` }
        break
      }

      case 'list': {
        // List all coupons (with optional filters)
        const { user_id, code, is_used, limit = 100 } = body

        let query = supabaseClient
          .from('user_coupons')
          .select('*, profiles:user_id(nome, email:user_id)')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (user_id) query = query.eq('user_id', user_id)
        if (code) query = query.eq('code', code)
        if (is_used !== undefined) query = query.eq('is_used', is_used)

        const { data, error } = await query

        if (error) throw error

        result = { success: true, coupons: data }
        break
      }

      case 'stats': {
        // Get coupon statistics
        const { data: totalCoupons, error: e1 } = await supabaseClient
          .from('user_coupons')
          .select('id', { count: 'exact', head: true })

        const { data: usedCoupons, error: e2 } = await supabaseClient
          .from('user_coupons')
          .select('id', { count: 'exact', head: true })
          .eq('is_used', true)

        const { data: availableCoupons, error: e3 } = await supabaseClient
          .from('user_coupons')
          .select('id', { count: 'exact', head: true })
          .eq('is_used', false)

        const { data: codeStats, error: e4 } = await supabaseClient
          .from('user_coupons')
          .select('code')

        if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4

        // Count by code
        const codeBreakdown: Record<string, number> = {}
        codeStats?.forEach(c => {
          codeBreakdown[c.code] = (codeBreakdown[c.code] || 0) + 1
        })

        result = { 
          success: true, 
          stats: {
            total: totalCoupons,
            used: usedCoupons,
            available: availableCoupons,
            by_code: codeBreakdown
          }
        }
        break
      }

      default:
        throw new Error(`Invalid action: ${action}`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Manage Coupons] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
