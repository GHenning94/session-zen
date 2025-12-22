import { createContext, useContext, ReactNode, useEffect, useCallback, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook centralizado para gerenciar TODOS os canais Realtime
 * Evita canais duplicados e otimiza o uso de conexões
 */

interface RealtimeEvent {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  record: any
}

type RealtimeCallback = (event: RealtimeEvent) => void

interface GlobalRealtimeContextType {
  subscribe: (tables: string[], callback: RealtimeCallback) => () => void
  isConnected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
}

const GlobalRealtimeContext = createContext<GlobalRealtimeContextType | undefined>(undefined)

export const useGlobalRealtime = () => {
  const context = useContext(GlobalRealtimeContext)
  if (!context) {
    throw new Error('useGlobalRealtime must be used within GlobalRealtimeProvider')
  }
  return context
}

interface GlobalRealtimeProviderProps {
  children: ReactNode
}

export const GlobalRealtimeProvider = ({ children }: GlobalRealtimeProviderProps) => {
  const { user } = useAuth()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [callbacks, setCallbacks] = useState<Map<string, Set<RealtimeCallback>>>(new Map())

  /**
   * Cria um ÚNICO canal para todos os eventos
   */
  useEffect(() => {
    if (!user) {
      if (channel) {
        supabase.removeChannel(channel)
        setChannel(null)
      }
      setConnectionStatus('disconnected')
      return
    }

    console.log('[GlobalRealtime] 🔌 Initializing global realtime channel')
    setConnectionStatus('connecting')

    // CRITICAL: Set the auth token for Realtime BEFORE creating channels
    // This is required because supabase-js doesn't automatically inherit the auth token
    const setupRealtimeAuth = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session?.access_token) {
        console.log('[GlobalRealtime] Setting Realtime auth token')
        supabase.realtime.setAuth(sessionData.session.access_token)
      }
    }
    setupRealtimeAuth()

    // ÚNICO canal para sessions, clients, payments (notifications handled separately by NotificationContext)
    const globalChannel = supabase
      .channel('global-realtime')
      // Sessions
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        notifyCallbacks('sessions', payload)
      })
      // Clients
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        notifyCallbacks('clients', payload)
      })
      // Payments
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        notifyCallbacks('payments', payload)
      })
      // Packages
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'packages',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        notifyCallbacks('packages', payload)
      })
      .subscribe((status) => {
        console.log('[GlobalRealtime] Status:', status)
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          console.log('[GlobalRealtime] ✅ Connected successfully')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected')
          console.error('[GlobalRealtime] ❌ Connection error:', status)
        }
      })

    setChannel(globalChannel)

    return () => {
      console.log('[GlobalRealtime] 🔌 Disconnecting global channel')
      supabase.removeChannel(globalChannel)
      setChannel(null)
      setConnectionStatus('disconnected')
    }
  }, [user?.id])

  /**
   * Notifica todos os callbacks registrados para uma tabela
   */
  const notifyCallbacks = useCallback((table: string, payload: any) => {
    const tableCallbacks = callbacks.get(table)
    if (!tableCallbacks) return

    const event: RealtimeEvent = {
      table,
      eventType: payload.eventType,
      record: payload.new || payload.old
    }

    tableCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error(`[GlobalRealtime] Error in callback for ${table}:`, error)
      }
    })
  }, [callbacks])

  /**
   * Registra um callback para escutar mudanças em tabelas específicas
   * Retorna função para cancelar a inscrição
   */
  const subscribe = useCallback((tables: string[], callback: RealtimeCallback): (() => void) => {
    const callbackId = Math.random().toString(36)
    
    console.log('[GlobalRealtime] 📝 Subscribing to tables:', tables)

    // Adicionar callback para cada tabela
    setCallbacks(prev => {
      const updated = new Map(prev)
      tables.forEach(table => {
        if (!updated.has(table)) {
          updated.set(table, new Set())
        }
        updated.get(table)!.add(callback)
      })
      return updated
    })

    // Retornar função de cleanup
    return () => {
      console.log('[GlobalRealtime] 🗑️ Unsubscribing from tables:', tables)
      setCallbacks(prev => {
        const updated = new Map(prev)
        tables.forEach(table => {
          const tableCallbacks = updated.get(table)
          if (tableCallbacks) {
            tableCallbacks.delete(callback)
            if (tableCallbacks.size === 0) {
              updated.delete(table)
            }
          }
        })
        return updated
      })
    }
  }, [])

  return (
    <GlobalRealtimeContext.Provider value={{
      subscribe,
      isConnected: connectionStatus === 'connected',
      connectionStatus
    }}>
      {children}
    </GlobalRealtimeContext.Provider>
  )
}
