import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

const VAPID_PUBLIC_KEY = 'BJ8nZ3cC9v6kNl0D_8gZ4xYq7TfE-2MnLp3rWsK5vQo8HjGf6Ud4Xe3TcRb2Yp1Qs7Vr9Zw0Xj5Kl8Nm6Oo4Pp2Qq3'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const usePushSubscription = () => {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    // Check if Service Worker and Push are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)
    
    if (supported && 'Notification' in window) {
      setPermission(Notification.permission)
    }

    if (supported) {
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('[usePushSubscription] Error checking subscription:', error)
    }
  }

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      console.log('[usePushSubscription] Push notifications not supported')
      return false
    }

    setLoading(true)

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        console.log('[usePushSubscription] Permission denied')
        return false
      }

      // Register service worker
      let registration = await navigator.serviceWorker.getRegistration()
      
      if (!registration) {
        console.log('[usePushSubscription] Registering service worker...')
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        await navigator.serviceWorker.ready
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      console.log('[usePushSubscription] Push subscription created:', subscription)

      // Save subscription to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('[usePushSubscription] No authenticated user')
        return false
      }

      const subscriptionJson = subscription.toJSON()
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        }, {
          onConflict: 'user_id,endpoint'
        })

      if (error) {
        console.error('[usePushSubscription] Error saving subscription:', error)
        return false
      }

      console.log('[usePushSubscription] Subscription saved to database')
      setIsSubscribed(true)
      return true

    } catch (error) {
      console.error('[usePushSubscription] Error subscribing:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        console.log('[usePushSubscription] Unsubscribed from push')

        // Remove from database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
        }

        setIsSubscribed(false)
        return true
      }

      return false
    } catch (error) {
      console.error('[usePushSubscription] Error unsubscribing:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    checkSubscription
  }
}
