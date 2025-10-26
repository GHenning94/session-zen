import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

// IMPORTANTE: Esta chave DEVE ser EXATAMENTE a mesma configurada no secret VAPID_PUBLIC_KEY
// Para atualizar: copie o valor do secret VAPID_PUBLIC_KEY que você acabou de configurar
const VAPID_PUBLIC_KEY = 'BO42fKwRjp3_PQGFeXZ5CeDSAw3YI4iUd_xD9DLjhEDOFnyf7VhhzKp9gir9vzSiIdYWEzDliZlxng0_lFF2luc'

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
  const { user } = useAuth()
  const autoSubscribeAttempted = useRef(false)

  useEffect(() => {
    // Check if Service Worker and Push are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    console.log('[usePushSubscription] Browser support check:', {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      supported
    })
    
    setIsSupported(supported)
    
    if (supported && 'Notification' in window) {
      setPermission(Notification.permission)
    }

    if (supported) {
      checkSubscription()
    }
  }, [user])

  // Auto-subscribe disabled to prevent errors - user must click to enable
  useEffect(() => {
    // Auto-subscribe disabled
  }, [isSupported, permission, isSubscribed, loading, user])

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
    console.log('[usePushSubscription] Subscribe called')
    
    if (!isSupported) {
      console.warn('[usePushSubscription] Push notifications not supported')
      return false
    }

    // Check PushManager availability
    if (!('PushManager' in window)) {
      console.error('[usePushSubscription] PushManager not available')
      return false
    }

    setLoading(true)

    try {
      // Request notification permission (skip if already granted)
      if (Notification.permission !== 'granted') {
        console.log('[usePushSubscription] 📋 Requesting notification permission...')
        const permissionResult = await Notification.requestPermission()
        console.log('[usePushSubscription] Permission result:', permissionResult)
        setPermission(permissionResult)

        if (permissionResult !== 'granted') {
          console.warn('[usePushSubscription] ⚠️ Permission not granted:', permissionResult)
          
          if (permissionResult === 'denied') {
            toast.error(
              'Notificações bloqueadas. Para reativar, acesse as configurações do navegador.',
              { duration: 6000 }
            )
          } else {
            toast.error('Permissão para notificações não concedida')
          }
          
          return false
        }
      } else {
        console.log('[usePushSubscription] ✅ Permission already granted, proceeding...')
        setPermission('granted')
      }

      console.log('[usePushSubscription] Getting service worker registration...')
      
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration()
      
      if (!registration) {
        console.log('[usePushSubscription] No existing registration, registering service worker...')
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        console.log('[usePushSubscription] Service worker registered')
        await navigator.serviceWorker.ready
        console.log('[usePushSubscription] Service worker ready')
      } else {
        console.log('[usePushSubscription] Using existing service worker registration')
      }

      console.log('[usePushSubscription] Subscribing to push...')
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      console.log('[usePushSubscription] Push subscription created successfully')
      console.log('[usePushSubscription] Subscription endpoint:', subscription.endpoint)

      // Save subscription to Supabase
      console.log('[usePushSubscription] Getting authenticated user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('[usePushSubscription] Error getting user:', userError)
        return false
      }
      
      if (!user) {
        console.error('[usePushSubscription] No authenticated user found')
        return false
      }

      console.log('[usePushSubscription] User authenticated:', user.id)
      console.log('[usePushSubscription] Saving subscription to Supabase...')

      const subscriptionJson = subscription.toJSON()
      
      // Primeiro, deletar qualquer inscrição antiga para garantir chaves atualizadas
      console.log('[usePushSubscription] Removing old subscriptions for user...')
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
      
      // Agora inserir a nova inscrição
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        })
        .select()

      if (error) {
        console.error('[usePushSubscription] Error saving subscription to Supabase:', error)
        console.error('[usePushSubscription] Error details:', JSON.stringify(error, null, 2))
        toast.error('Erro ao ativar notificações. Tente novamente.')
        return false
      }

      console.log('[usePushSubscription] ✅ Subscription saved successfully to database!')
      console.log('[usePushSubscription] Saved data:', data)
      setIsSubscribed(true)
      
      toast.success('Notificações ativadas! Você receberá alertas importantes.', {
        duration: 4000,
      })
      
      return true

    } catch (error) {
      console.error('[usePushSubscription] ❌ Error during subscription process:', error)
      if (error instanceof Error) {
        console.error('[usePushSubscription] Error message:', error.message)
        console.error('[usePushSubscription] Error stack:', error.stack)
        
        // Provide user-friendly error messages
        if (error.message.includes('Registration failed')) {
          toast.error(
            'Erro ao registrar notificações. Verifique se o navegador suporta push notifications.',
            { duration: 6000 }
          )
        } else if (error.message.includes('subscription')) {
          toast.error(
            'Erro ao criar inscrição de notificações. Tente novamente.',
            { duration: 4000 }
          )
        }
      }
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
