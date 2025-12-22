import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { playNotificationSound } from '@/hooks/useNotificationSound'

interface Notification {
  id: string
  titulo: string
  conteudo: string
  data: string
  lida: boolean
  user_id: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  incomingNotification: Notification | null
  markAsRead: (id: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  deleteNotification: (id: string) => Promise<boolean>
  createNotification: (titulo: string, conteudo: string) => Promise<boolean>
  markVisibleAsRead: () => Promise<void>
  clearIncomingNotification: () => void
  triggerToast: (notification: { id: string; titulo: string; conteudo: string }) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [incomingNotification, setIncomingNotification] = useState<Notification | null>(null)
  const seenNotificationIds = useRef(new Set<string>())
  const isSubscribedRef = useRef(false)
  const isCleaningUpRef = useRef(false)
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadDoneRef = useRef(false)

  const loadNotifications = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, titulo, conteudo, lida, data, user_id')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[NotificationContext] Error loading notifications:', error)
        return
      }

      // Update seen IDs
      (data || []).forEach((n: Notification) => seenNotificationIds.current.add(n.id))

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: Notification) => !n.lida).length)
      console.log('[NotificationContext] Notifications loaded:', data?.length || 0)
      initialLoadDoneRef.current = true
    } catch (error) {
      console.error('[NotificationContext] Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Set up realtime subscription - ONLY depends on user.id
  useEffect(() => {
    if (!user) return
    
    // Prevent multiple subscriptions
    if (isSubscribedRef.current || isCleaningUpRef.current) {
      return
    }

    console.log(`[NotificationContext] Initializing subscription for user ${user.id}`)
    isSubscribedRef.current = true
    isCleaningUpRef.current = false
    
    let channel: ReturnType<typeof supabase.channel> | null = null
    
    // CRITICAL: Set the auth token for Realtime BEFORE creating channels
    // This MUST complete before we create the channel
    const initializeRealtimeSubscription = async () => {
      try {
        // Step 1: Get session and set auth token FIRST
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.access_token) {
          console.log('[NotificationContext] Setting Realtime auth token BEFORE creating channel')
          supabase.realtime.setAuth(sessionData.session.access_token)
        } else {
          console.warn('[NotificationContext] No access token available for Realtime')
        }
        
        // Step 2: Load notifications
        await loadNotifications()
        
        // Step 3: NOW create the channel (after auth is set)
        const channelName = `notifications_user_${user.id}_${Date.now()}`
        console.log(`[NotificationContext] Creating channel: ${channelName}`)
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('[NotificationContext] INSERT event received:', payload)
              const newNotification = payload.new as Notification
              console.log('[NotificationContext] New notification:', newNotification.id, newNotification.titulo)
              
              // Check if already seen (avoid duplicates)
              if (seenNotificationIds.current.has(newNotification.id)) {
                console.log('[NotificationContext] Notification already seen, skipping')
                return
              }
              
              seenNotificationIds.current.add(newNotification.id)
              
              // Play notification sound
              console.log('[NotificationContext] Playing notification sound')
              playNotificationSound()
              
              // Set incoming notification for custom toast animation
              console.log('[NotificationContext] CALLING setIncomingNotification with:', newNotification.titulo)
              setIncomingNotification(newNotification)
              
              setNotifications((prev) => [newNotification, ...prev].slice(0, 50))
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('[NotificationContext] UPDATE event received:', payload)
              const updatedNotification = payload.new as Notification
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
              )
              
              if (updatedNotification.lida) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('[NotificationContext] DELETE event received:', payload)
              const deletedId = payload.old.id
              setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
              
              if (!payload.old.lida) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
              }
            }
          )
          .subscribe((status) => {
            console.log(`[NotificationContext] Subscription status: ${status}`)
            if (status === 'SUBSCRIBED') {
              console.log('[NotificationContext] Successfully subscribed to realtime notifications!')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[NotificationContext] Channel error - realtime may not work')
            } else if (status === 'TIMED_OUT') {
              console.error('[NotificationContext] Subscription timed out')
            }
          })
      } catch (error) {
        console.error('[NotificationContext] Error initializing realtime subscription:', error)
      }
    }
    
    initializeRealtimeSubscription()

    return () => {
      console.log(`[NotificationContext] Cleaning up subscription`)
      isCleaningUpRef.current = true
      isSubscribedRef.current = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id, loadNotifications])

  // Handle visibility changes for reconciliation only
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      
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
              console.error('[NotificationContext] Error loading notifications:', error)
              return
            }

            (data || []).forEach((n: Notification) => seenNotificationIds.current.add(n.id))
            setNotifications(data || [])
            setUnreadCount((data || []).filter((n: Notification) => !n.lida).length)
          } catch (error) {
            console.error('[NotificationContext] Error loading notifications:', error)
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
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          titulo,
          conteudo,
          lida: false
        }])
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar notificação:', error)
        return false
      }

      // Trigger toast directly since realtime may be unreliable
      if (data) {
        console.log('[NotificationContext] createNotification - triggering toast directly for:', data.titulo)
        
        // Play notification sound
        playNotificationSound()
        
        setIncomingNotification(data as Notification)
        setNotifications((prev) => [data as Notification, ...prev].slice(0, 50))
        seenNotificationIds.current.add(data.id)
      }

      return true
    } catch (error) {
      console.error('Erro:', error)
      return false
    }
  }

  // Trigger toast manually (for testing or direct triggering)
  const triggerToast = (notification: { id: string; titulo: string; conteudo: string }) => {
    console.log('[NotificationContext] triggerToast called with:', notification.titulo)
    
    // Play notification sound
    playNotificationSound()
    
    setIncomingNotification(notification as Notification)
  }

  // Clear incoming notification and show badge
  const clearIncomingNotification = useCallback(() => {
    setIncomingNotification((current) => {
      if (current) {
        setUnreadCount((prev) => prev + 1)
      }
      return null
    })
  }, [])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    incomingNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    markVisibleAsRead,
    clearIncomingNotification,
    triggerToast
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }
  return context
}
