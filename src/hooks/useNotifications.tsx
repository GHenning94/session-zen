import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'

interface Notification {
  id: string
  titulo: string
  conteudo: string
  data: string
  lida: boolean
  user_id: string
}

export const useNotifications = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const { showNotification } = useBrowserNotifications()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const seenNotificationIds = useRef(new Set<string>())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadNotifications = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[useNotifications] Error loading notifications:', error)
        return
      }

      // Update seen IDs
      (data || []).forEach((n: Notification) => seenNotificationIds.current.add(n.id))

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: Notification) => !n.lida).length)
      console.log('[useNotifications] Notifications loaded:', data?.length || 0)
    } catch (error) {
      console.error('[useNotifications] Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Polling for background tabs
  const startBackgroundPolling = useCallback(() => {
    if (pollingIntervalRef.current) return

    console.log('[useNotifications] Starting background polling')
    pollingIntervalRef.current = setInterval(async () => {
      if (!user || document.visibilityState === 'visible') return

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('data', { ascending: false })
          .limit(10)

        if (error) {
          console.error('[useNotifications] Error in background polling:', error)
          return
        }

        const newNotifications = (data || []).filter(
          (n: Notification) => !seenNotificationIds.current.has(n.id)
        )

        if (newNotifications.length > 0) {
          console.log('[useNotifications] Found new notifications in background:', newNotifications.length)
          
          // Add to seen IDs
          newNotifications.forEach((n: Notification) => seenNotificationIds.current.add(n.id))
          
          // Update state
          setNotifications((prev) => {
            const updated = [...newNotifications, ...prev]
            return updated.slice(0, 50) // Keep only 50 most recent
          })
          setUnreadCount((prev) => prev + newNotifications.filter((n: Notification) => !n.lida).length)
          
          // Show push notifications for unread
          newNotifications
            .filter((n: Notification) => !n.lida)
            .forEach((n: Notification) => {
              showNotification(n.titulo, n.conteudo)
            })
        }
      } catch (error) {
        console.error('[useNotifications] Error in background polling:', error)
      }
    }, 25000) // Poll every 25 seconds when in background
  }, [user, showNotification])

  const stopBackgroundPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('[useNotifications] Stopping background polling')
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return

    loadNotifications()

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[useNotifications] Realtime event:', payload.eventType)
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification
            
            // Check if already seen (avoid duplicates)
            if (seenNotificationIds.current.has(newNotification.id)) {
              console.log('[useNotifications] Notification already seen, skipping')
              return
            }
            
            seenNotificationIds.current.add(newNotification.id)
            
            setNotifications((prev) => [newNotification, ...prev].slice(0, 50))
            setUnreadCount((prev) => prev + 1)
            
            // Show browser notification only if tab is not visible
            if (document.visibilityState !== 'visible') {
              console.log('[useNotifications] Showing push notification')
              showNotification(
                newNotification.titulo,
                newNotification.conteudo
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            )
            
            if (updatedNotification.lida) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
            
            if (!payload.old.lida) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      stopBackgroundPolling()
    }
  }, [user, showNotification, loadNotifications, stopBackgroundPolling])

  // Handle visibility changes for polling and reconciliation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useNotifications] Tab visible, stopping polling and reloading')
        stopBackgroundPolling()
        if (user) {
          loadNotifications()
        }
      } else {
        console.log('[useNotifications] Tab hidden, starting background polling')
        startBackgroundPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Start polling if already hidden
    if (document.visibilityState !== 'visible') {
      startBackgroundPolling()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopBackgroundPolling()
    }
  }, [user, loadNotifications, startBackgroundPolling, stopBackgroundPolling])

  // Auto-marcar notificações como lidas quando o dropdown abrir
  const markVisibleAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.lida)
    if (unreadNotifications.length === 0) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('user_id', user?.id)
        .eq('lida', false)

      if (!error) {
        // Atualizar estado local imediatamente
        setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Erro ao marcar como lidas:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Atualizar estado local imediatamente
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, lida: true } : n
        )
      )

      return true
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
      return false
    }
  }

  const markAllAsRead = async () => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('user_id', user.id)
        .eq('lida', false)

      if (error) throw error

      // Atualizar estado local imediatamente
      setNotifications(prev => 
        prev.map(n => ({ ...n, lida: true }))
      )

      return true
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
      return false
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user) return false
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Erro ao deletar notificação:', error)
        return false
      }

      // Atualizar estado local imediatamente
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.lida ? prev - 1 : prev
      })

      return true
    } catch (error) {
      console.error('Erro:', error)
      return false
    }
  }

  const createNotification = async (titulo: string, conteudo: string) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          titulo,
          conteudo,
          lida: false
        }])

      if (error) {
        console.error('Erro ao criar notificação:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro:', error)
      return false
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    markVisibleAsRead
  }
}
