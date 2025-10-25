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
    const { user_id, title, body, url, tag } = payload

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[push-broadcast] Broadcasting to user: ${user_id}`)

    // Fetch user's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (fetchError) {
      console.error('[push-broadcast] Error fetching subscriptions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[push-broadcast] No subscriptions found for user')
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send push to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendWebPush(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          { title, body, url, tag }
        )
      )
    )

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failedCount = results.length - successCount

    console.log(`[push-broadcast] Sent ${successCount}/${results.length} notifications`)

    // Clean up failed subscriptions (optional - they might just be temporarily offline)
    // You could implement logic here to remove subscriptions that consistently fail

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
    console.error('[push-broadcast] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
