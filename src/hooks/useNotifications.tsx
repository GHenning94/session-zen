import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carregar notificações existentes
  useEffect(() => {
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

    loadNotifications()
  }, [user])

  // Configurar realtime subscription
  useEffect(() => {
    if (!user) return

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
          console.log('Notification change:', payload)

          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Mostrar toast para nova notificação
            toast({
              title: newNotification.titulo,
              description: newNotification.conteudo,
              duration: 5000,
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
            
            // Recalcular contagem não lidas
            setNotifications(current => {
              setUnreadCount(current.filter(n => !n.lida).length)
              return current
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications(prev => prev.filter(n => n.id !== deletedId))
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, toast])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Erro ao marcar como lida:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro:', error)
      return false
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('user_id', user?.id)
        .eq('lida', false)

      if (error) {
        console.error('Erro ao marcar todas como lidas:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro:', error)
      return false
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Erro ao deletar notificação:', error)
        return false
      }

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
    createNotification
  }
}