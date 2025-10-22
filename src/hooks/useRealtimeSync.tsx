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
  // --- INÍCIO DA CORREÇÃO 1 ---
  // Precisamos saber se a autenticação (incluindo 2FA) está carregando
  const { user, loading: authLoading } = useAuth()
  // --- FIM DA CORREÇÃO 1 ---
  
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [autoSync, setAutoSync] = useState(false) // Desabilitar por enquanto

  // Cache (código inalterado)
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
    // --- INÍCIO DA CORREÇÃO 2 ---
    // Adicionada a verificação 'authLoading'
    if (!user || authLoading || isLoading) return
    // --- FIM DA CORREÇÃO 2 ---

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
      
      // Atualizar cache e localStorage (código inalterado)
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

      // Dispatar eventos customizados para atualizar componentes (código inalterado)
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
  // --- INÍCIO DA CORREÇÃO 3 ---
  // Adicionada a dependência 'authLoading'
  }, [user, authLoading, isLoading, cache, toast])
  // --- FIM DA CORREÇÃO 3 ---

  // Configurar realtime subscriptions (DESABILITADO - inalterado)
  /*
  ... (código inalterado) ...
  */

  // Handler para atualizações em tempo real (inalterado)
  const handleRealtimeUpdate = useCallback((type: string, payload: any) => {
    // ... (código inalterado) ...
  }, [toast])

  // Auto-sync periódico (DESABILITADO - inalterado)
  /*
  ... (código inalterado) ...
  */

  // --- INÍCIO DA CORREÇÃO 4 ---
  // Sync inicial (CORRIGIDO e HABILITADO)
  // Este era o 'useEffect' que estava faltando ou desabilitado
  useEffect(() => {
    // Só sincronize se o usuário existir E a autenticação NÃO estiver carregando
    if (user && !authLoading) {
      console.log('useRealtimeSync: User logged in and auth complete. Starting initial sync.');
      syncData('all')
    } else if (!user) {
       console.log('useRealtimeSync: No user, skipping sync.');
    } else if (authLoading) {
       console.log('useRealtimeSync: User found, but auth is still loading (2FA pending?). Waiting...');
    }
  // Depende do ID do usuário (para rodar no login) e do status de authLoading
  }, [user?.id, authLoading]) // <--- A CORREÇÃO CRÍTICA
  // --- FIM DA CORREÇÃO 4 ---


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

// Funções auxiliares (inalteradas)
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