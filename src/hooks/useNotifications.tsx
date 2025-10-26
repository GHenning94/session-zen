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
  const isSubscribedRef = useRef(false)
  const isCleaningUpRef = useRef(false)
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const showNotificationRef = useRef(showNotification)

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

  // Polling for background tabs (DISABLED - using realtime only)
  const startBackgroundPolling = useCallback(() => {
    // Polling disabled - realtime handles everything
    return
  }, [user, showNotification])

  const stopBackgroundPolling = useCallback(() => {
    // Polling disabled
    return
  }, [])

  // Keep showNotification ref updated without triggering re-subscriptions
  useEffect(() => {
    showNotificationRef.current = showNotification
  }, [showNotification])

  // Set up realtime subscription - ONLY depends on user.id
  useEffect(() => {
    if (!user) return
    
    // Prevent multiple subscriptions
    if (isSubscribedRef.current || isCleaningUpRef.current) {
      return
    }

    console.log(`[${new Date().toISOString()}] [useNotifications] Initializing subscription`)
    isSubscribedRef.current = true
    isCleaningUpRef.current = false
    
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
            if (document.visibilityState !== 'visible' && showNotificationRef.current) {
              showNotificationRef.current(
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
      console.log(`[${new Date().toISOString()}] [useNotifications] Cleaning up subscription`)
      isCleaningUpRef.current = true
      isSubscribedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // ONLY depend on user.id, not the entire user object

  // Handle visibility changes for reconciliation only (no polling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Clear any pending timeout
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      
      // Debounce the reload (only when tab becomes visible after being hidden)
      if (document.visibilityState === 'visible' && user) {
        visibilityTimeoutRef.current = setTimeout(async () => {
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

            (data || []).forEach((n: Notification) => seenNotificationIds.current.add(n.id))
            setNotifications(data || [])
            setUnreadCount((data || []).filter((n: Notification) => !n.lida).length)
          } catch (error) {
            console.error('[useNotifications] Error loading notifications:', error)
          }
        }, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

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
