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
  
  // Queue for processing notifications one at a time
  const notificationQueueRef = useRef<Notification[]>([])
  const isProcessingQueueRef = useRef(false)
  
  const seenNotificationIds = useRef(new Set<string>())
  const isSubscribedRef = useRef(false)
  const isCleaningUpRef = useRef(false)
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadDoneRef = useRef(false)
  const pendingNotificationsShownRef = useRef(false)
  const lastKnownNotificationTimestampRef = useRef<string | null>(null)

  // Process the notification queue one at a time
  const processNextNotification = useCallback((playSound = true) => {
    console.log('[NotificationContext] processNextNotification called, queue length:', notificationQueueRef.current.length, 'isProcessing:', isProcessingQueueRef.current)
    
    if (isProcessingQueueRef.current) {
      console.log('[NotificationContext] Already processing, skipping')
      return
    }
    
    if (notificationQueueRef.current.length === 0) {
      console.log('[NotificationContext] Queue is empty')
      return
    }
    
    isProcessingQueueRef.current = true
    const nextNotification = notificationQueueRef.current.shift()!
    
    console.log('[NotificationContext] Processing notification from queue:', nextNotification.id, nextNotification.titulo)
    
    // Play sound when notification is actually displayed (synced with animation)
    if (playSound) {
      playNotificationSound()
    }
    
    setIncomingNotification(nextNotification)
  }, [])

  // Add notification to queue and start processing if not already
  const enqueueNotification = useCallback((notification: Notification, playSoundWithDisplay = true) => {
    console.log('[NotificationContext] Enqueueing notification:', notification.id, notification.titulo)
    
    // Store whether this notification should play sound when displayed
    const notificationWithSound = { ...notification, _playSound: playSoundWithDisplay }
    notificationQueueRef.current.push(notificationWithSound as Notification)
    
    // If not currently processing, start processing (sound plays when notification is shown)
    if (!isProcessingQueueRef.current) {
      processNextNotification(playSoundWithDisplay)
    }
  }, [processNextNotification])

  // Clear incoming notification and process next in queue
  const clearIncomingNotification = useCallback(() => {
    setIncomingNotification((current) => {
      if (current) {
        console.log('[NotificationContext] Clearing notification:', current.id)
        // Don't increment unreadCount here - it's already counted by loadNotifications
        // and Realtime INSERT handler updates the notifications array directly
      }
      return null
    })
    
    // Mark as not processing and process next
    isProcessingQueueRef.current = false
    
    // Small delay to allow UI to update before showing next
    // Sound will play when the next notification is processed (synced with animation)
    setTimeout(() => {
      processNextNotification(true)
    }, 300)
  }, [processNextNotification])

  const loadNotifications = useCallback(async (markAsSeen = true) => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, titulo, conteudo, lida, data, user_id')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[NotificationContext] Error loading notifications:', error)
        return []
      }

      // Only mark READ notifications as seen (so unread ones can still trigger toast)
      if (markAsSeen) {
        (data || []).filter((n: Notification) => n.lida).forEach((n: Notification) => seenNotificationIds.current.add(n.id))
      }

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: Notification) => !n.lida).length)
      console.log('[NotificationContext] Notifications loaded:', data?.length || 0)
      initialLoadDoneRef.current = true
      return data || []
    } catch (error) {
      console.error('[NotificationContext] Error loading notifications:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // Show pending unread notifications when user comes online (only once per session)
  const showPendingNotifications = useCallback(async () => {
    if (!user || pendingNotificationsShownRef.current) return
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, titulo, conteudo, lida, data, user_id')
        .eq('user_id', user.id)
        .eq('lida', false)
        .order('data', { ascending: true }) // Show oldest first
        .limit(10) // Limit to avoid overwhelming the user

      if (error) {
        console.error('[NotificationContext] Error loading pending notifications:', error)
        return
      }

      if (data && data.length > 0) {
        console.log('[NotificationContext] Found pending unread notifications:', data.length)
        pendingNotificationsShownRef.current = true
        
        // Add all pending notifications to the queue (they will be processed one at a time)
        data.forEach((notification: Notification) => {
          if (!seenNotificationIds.current.has(notification.id)) {
            seenNotificationIds.current.add(notification.id)
            enqueueNotification(notification)
          }
        })
      }
    } catch (error) {
      console.error('[NotificationContext] Error loading pending notifications:', error)
    }
  }, [user, enqueueNotification])

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
        
        // Step 3: Show pending notifications for users who just came online
        await showPendingNotifications()
        
        // Step 4: NOW create the channel (after auth is set)
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
              
              // Add to queue instead of showing directly
              enqueueNotification(newNotification)
              
              // Update notifications array and unread count
              setNotifications((prev) => [newNotification, ...prev].slice(0, 50))
              if (!newNotification.lida) {
                setUnreadCount((prev) => prev + 1)
              }
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
  }, [user?.id, loadNotifications, showPendingNotifications, enqueueNotification])

  // Handle visibility changes for reconciliation and showing pending notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      
      if (document.visibilityState === 'hidden') {
        // Save the timestamp of the last known notification when leaving
        if (notifications.length > 0) {
          lastKnownNotificationTimestampRef.current = notifications[0].data
        }
      } else if (document.visibilityState === 'visible' && user) {
        visibilityTimeoutRef.current = setTimeout(async () => {
          if (!user) return
          
          try {
            // Build query - fetch notifications
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

            // Find notifications that arrived while tab was hidden
            // These are notifications we haven't seen AND haven't shown yet
            const newNotifications = (data || []).filter((n: Notification) => {
              const isNew = !seenNotificationIds.current.has(n.id)
              const isNewer = lastKnownNotificationTimestampRef.current 
                ? new Date(n.data).getTime() > new Date(lastKnownNotificationTimestampRef.current).getTime()
                : false
              return isNew && !n.lida && isNewer
            })
            
            if (newNotifications.length > 0) {
              console.log('[NotificationContext] Found new notifications while tab was hidden:', newNotifications.length)
              
              // Play sound once for all new notifications (user is now active)
              playNotificationSound()
              
              // Sort by date ascending (oldest first) and add to queue WITHOUT playing sound again
              newNotifications
                .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                .forEach((notification: Notification) => {
                  seenNotificationIds.current.add(notification.id)
                  enqueueNotification(notification, false) // Don't play sound again
                })
            }

            // Update seen IDs only for READ notifications (unread ones can still trigger toast via Realtime)
            (data || []).filter((n: Notification) => n.lida).forEach((n: Notification) => seenNotificationIds.current.add(n.id))
            setNotifications(data || [])
            setUnreadCount((data || []).filter((n: Notification) => !n.lida).length)
            
            // Update last known timestamp
            if (data && data.length > 0) {
              lastKnownNotificationTimestampRef.current = data[0].data
            }
          } catch (error) {
            console.error('[NotificationContext] Error loading notifications:', error)
          }
        }, 300)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, notifications, enqueueNotification])

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

      // Add to queue instead of showing directly
      if (data) {
        console.log('[NotificationContext] createNotification - enqueueing notification:', data.titulo)
        seenNotificationIds.current.add(data.id)
        enqueueNotification(data as Notification)
        setNotifications((prev) => [data as Notification, ...prev].slice(0, 50))
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
    enqueueNotification(notification as Notification)
  }

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
