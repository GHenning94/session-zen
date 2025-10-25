import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications"

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

  // Carregar notificações existentes
  const loadNotifications = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Erro ao carregar notificações:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.lida).length || 0)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [user])

  // Configurar realtime subscription
  useEffect(() => {
    if (!user) return

    console.log('✅ Conectando ao canal de notificações...');

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
        (payload) => {
          console.log('🔔 Notificação recebida:', payload)

          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Show browser notification
            showNotification(newNotification.titulo, newNotification.conteudo)
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
            
            // Recalcular contagem não lidas imediatamente
            setTimeout(() => {
              setNotifications(current => {
                const newUnreadCount = current.filter(n => !n.lida).length
                setUnreadCount(newUnreadCount)
                return current
              })
            }, 100)
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications(prev => {
              const filtered = prev.filter(n => n.id !== deletedId)
              setUnreadCount(filtered.filter(n => !n.lida).length)
              return filtered
            })
          }
        }
      )
      .subscribe()

    // Keepalive: mantém conexão Realtime ativa mesmo em background
    const keepAliveInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        console.log('🔄 Mantendo conexão Realtime ativa em background');
      }
    }, 30000); // 30 segundos

    return () => {
      console.log('🔌 Desconectando canal de notificações');
      clearInterval(keepAliveInterval);
      supabase.removeChannel(channel);
    }
  }, [user, toast])

  // Re-carregar notificações quando a aba voltar a ficar visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        console.log('🔄 Aba reativada, verificando notificações perdidas');
        loadNotifications();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

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
        
        // Removido toast para evitar spam de notificações
      }
    } catch (error) {
      console.error('Erro ao marcar como lidas:', error)
      // Removido toast para evitar spam de notificações
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
      // Removido toast para evitar spam de notificações
        return false
      }

      // Atualizar estado local imediatamente
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.lida ? prev - 1 : prev
      })

      // Removido toast para evitar spam de notificações

      return true
    } catch (error) {
      console.error('Erro:', error)
      // Removido toast para evitar spam de notificações
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