import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  user_id: string
  title: string
  body: string
  url?: string
  tag?: string
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  try {
    // Use the web-push library for Deno
    const webpush = await import('https://deno.land/x/webpush@0.0.6/mod.ts')
    
    const vapidDetails = {
      subject: 'mailto:noreply@therapypro.app',
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      vapidDetails
    )

    console.log('[push-broadcast] Push sent successfully to:', subscription.endpoint.substring(0, 50))
    return true
  } catch (error) {
    console.error('[push-broadcast] Error sending push:', error)
    return false
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const payload: PushPayload = await req.json()
    console.log('[push-broadcast] 📨 Received push request:', JSON.stringify(payload, null, 2))
    
    const { user_id, title, body, url, tag } = payload

    if (!user_id || !title || !body) {
      console.error('[push-broadcast] ❌ Missing required fields in request')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[push-broadcast] 🔍 Looking for subscriptions for user: ${user_id}`)

    // Fetch user's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (fetchError) {
      console.error('[push-broadcast] ❌ Error fetching subscriptions:', fetchError)
      console.error('[push-broadcast] Error details:', JSON.stringify(fetchError, null, 2))
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[push-broadcast] 📊 Query result:`, {
      subscriptionsFound: subscriptions?.length || 0,
      subscriptions: subscriptions
    })

    if (!subscriptions || subscriptions.length === 0) {
      console.warn('[push-broadcast] ⚠️ No subscriptions found for user:', user_id)
      console.log('[push-broadcast] This means the user has not subscribed to push notifications yet')
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: 'No subscriptions found - user needs to enable push notifications',
          user_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[push-broadcast] ✅ Found ${subscriptions.length} subscription(s), sending push...`)

    // Send push to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        console.log(`[push-broadcast] 📤 Sending to subscription ID: ${sub.id}`)
        console.log(`[push-broadcast] Endpoint: ${sub.endpoint}`)
        return sendWebPush(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          { title, body, url, tag }
        )
      })
    )

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failedCount = results.length - successCount

    // Log failed results for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[push-broadcast] ❌ Failed to send to subscription ${subscriptions[index].id}:`, result.reason)
      } else if (result.status === 'fulfilled') {
        console.log(`[push-broadcast] ✅ Successfully sent to subscription ${subscriptions[index].id}`)
      }
    })

    console.log(`[push-broadcast] 📊 Final result: ${successCount} success, ${failedCount} failed out of ${results.length} total`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: results.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[push-broadcast] ❌ Unexpected error:', error)
    if (error instanceof Error) {
      console.error('[push-broadcast] Error message:', error.message)
      console.error('[push-broadcast] Error stack:', error.stack)
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
