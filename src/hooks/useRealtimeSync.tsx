import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

interface RealtimeSyncContextType {
  syncData: (type: 'clients' | 'sessions' | 'payments' | 'all') => Promise<void>
  isLoading: boolean
  lastSync: Date | null
  autoSync: boolean
  setAutoSync: (enabled: boolean) => void
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType | undefined>(undefined)

export const useRealtimeSync = () => {
  const context = useContext(RealtimeSyncContext)
  if (!context) {
    throw new Error('useRealtimeSync must be used within a RealtimeSyncProvider')
  }
  return context
}

interface RealtimeSyncProviderProps {
  children: ReactNode
}

export const RealtimeSyncProvider = ({ children }: RealtimeSyncProviderProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [autoSync, setAutoSync] = useState(false) // Desabilitar por enquanto

  // Cache para evitar chamadas desnecessárias
  const [cache, setCache] = useState<{
    clients: any[]
    sessions: any[]
    payments: any[]
    lastUpdate: Record<string, Date>
  }>({
    clients: [],
    sessions: [],
    payments: [],
    lastUpdate: {}
  })

  // Sincronização inteligente de dados
  const syncData = useCallback(async (type: 'clients' | 'sessions' | 'payments' | 'all') => {
    if (!user || isLoading) return

    setIsLoading(true)
    try {
      const syncPromises: Promise<any>[] = []
      const typesToSync = type === 'all' ? ['clients', 'sessions', 'payments'] : [type]

      for (const dataType of typesToSync) {
        const lastUpdate = cache.lastUpdate[dataType]
        const baseQuery = supabase.from(getTableName(dataType))

        // Apenas buscar dados modificados desde a última sincronização
        let query = baseQuery
          .select(getSelectFields(dataType))
          .eq('user_id', user.id)

        if (lastUpdate) {
          query = query.gte('updated_at', lastUpdate.toISOString())
        }

        syncPromises.push(
          query.then(({ data, error }) => {
            if (error) throw error
            return { type: dataType, data: data || [] }
          }) as Promise<any>
        )
      }

      const results = await Promise.all(syncPromises)
      
      // Atualizar cache e localStorage
      const newCache = { ...cache }
      const currentTime = new Date()

      results.forEach(({ type: dataType, data }) => {
        if (data.length > 0) {
          // Merge com dados existentes de forma inteligente
          newCache[dataType as keyof typeof cache.clients] = mergeData(
            cache[dataType as keyof typeof cache.clients], 
            data
          )
          newCache.lastUpdate[dataType] = currentTime
          
          // Salvar no localStorage para persistência
          localStorage.setItem(`therapy-${dataType}`, JSON.stringify(newCache[dataType as keyof typeof cache.clients]))
        }
      })

      setCache(newCache)
      setLastSync(currentTime)

      // Dispatar eventos customizados para atualizar componentes
      typesToSync.forEach(syncType => {
        window.dispatchEvent(new CustomEvent(`sync-${syncType}`, { 
          detail: newCache[syncType as keyof typeof cache.clients] 
        }))
      })

    } catch (error) {
      console.error('Erro na sincronização:', error)
      toast({
        title: "Erro de Sincronização",
        description: "Não foi possível sincronizar os dados.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, isLoading, cache, toast])

  // Configurar realtime subscriptions (DESABILITADO para evitar loop)
  /*
  useEffect(() => {
    if (!user || !autoSync) return

    const channels: any[] = []

    // Subscription para clients
    const clientsChannel = supabase
      .channel('clients-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        handleRealtimeUpdate('clients', payload)
      })
      .subscribe()

    // Subscription para sessions
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        handleRealtimeUpdate('sessions', payload)
      })
      .subscribe()

    channels.push(clientsChannel, sessionsChannel)

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [user, autoSync])
  */

  // Handler para atualizações em tempo real
  const handleRealtimeUpdate = useCallback((type: string, payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setCache(prevCache => {
      const updatedCache = { ...prevCache }
      const dataArray = updatedCache[type as keyof typeof cache.clients] as any[]

      switch (eventType) {
        case 'INSERT':
          updatedCache[type as keyof typeof cache.clients] = [...dataArray, newRecord]
          break
        case 'UPDATE':
          updatedCache[type as keyof typeof cache.clients] = dataArray.map(item => 
            item.id === newRecord.id ? { ...item, ...newRecord } : item
          )
          break
        case 'DELETE':
          updatedCache[type as keyof typeof cache.clients] = dataArray.filter(item => 
            item.id !== oldRecord.id
          )
          break
      }

      // Atualizar localStorage
      localStorage.setItem(`therapy-${type}`, JSON.stringify(updatedCache[type as keyof typeof cache.clients]))
      
      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent(`sync-${type}`, { 
        detail: updatedCache[type as keyof typeof cache.clients] 
      }))

      return updatedCache
    })

    // Mostrar notificação para mudanças importantes
    if (eventType === 'INSERT') {
      toast({
        title: "Dados Atualizados",
        description: `Novo ${type === 'clients' ? 'cliente' : 'agendamento'} sincronizado.`,
      })
    }
  }, [toast])

  // Auto-sync periódico (DESABILITADO para evitar loop)
  /*
  useEffect(() => {
    if (!autoSync || !user) return

    const interval = setInterval(() => {
      syncData('all')
    }, 30000) // Sync a cada 30 segundos

    return () => clearInterval(interval)
  }, [autoSync, user, syncData])
  */

  // Sync inicial (DESABILITADO para evitar loop)
  /*
  useEffect(() => {
    if (user) {
      syncData('all')
    }
  }, [user])
  */

  return (
    <RealtimeSyncContext.Provider value={{
      syncData,
      isLoading,
      lastSync,
      autoSync,
      setAutoSync
    }}>
      {children}
    </RealtimeSyncContext.Provider>
  )
}

// Funções auxiliares
function getTableName(type: string): 'clients' | 'sessions' {
  switch (type) {
    case 'clients': return 'clients'
    case 'sessions': return 'sessions'
    case 'payments': return 'sessions' // pagamentos são parte das sessões
    default: return 'clients'
  }
}

function getSelectFields(type: string): string {
  switch (type) {
    case 'clients': return '*'
    case 'sessions': return '*, clients(nome)'
    case 'payments': return '*, clients(nome)'
    default: return '*'
  }
}

function mergeData(existing: any[], incoming: any[]): any[] {
  const merged = [...existing]
  
  incoming.forEach(newItem => {
    const existingIndex = merged.findIndex(item => item.id === newItem.id)
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...newItem }
    } else {
      merged.push(newItem)
    }
  })
  
  return merged
}