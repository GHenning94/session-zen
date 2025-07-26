import { useState, useEffect, useCallback } from 'react'
import { useRealtimeSync } from './useRealtimeSync'
import { useAuth } from './useAuth'
import { useSubscription } from './useSubscription'
import { useToast } from './use-toast'

interface UseSmartDataOptions {
  type: 'clients' | 'sessions' | 'payments'
  autoRefresh?: boolean
  dependencies?: string[]
}

export const useSmartData = <T = any>(options: UseSmartDataOptions) => {
  const { type, autoRefresh = true, dependencies = [] } = options
  const { user } = useAuth()
  const { syncData, isLoading: isSyncing } = useRealtimeSync()
  const { canAddClient, canAddSession, planLimits } = useSubscription()
  const { toast } = useToast()
  
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Carregar dados do localStorage e sincronizar
  const loadData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Carregar do localStorage primeiro (cache local)
      const cached = localStorage.getItem(`therapy-${type}`)
      if (cached) {
        const cachedData = JSON.parse(cached)
        setData(cachedData)
      }

      // Sincronizar com servidor
      await syncData(type)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [user, type, syncData])

  // Validação inteligente baseada no plano
  const validateOperation = useCallback((operation: 'add' | 'update' | 'delete', item?: any) => {
    const errors: string[] = []

    if (operation === 'add') {
      if (type === 'clients') {
        if (!canAddClient(data.length)) {
          errors.push(`Limite de ${planLimits.maxClients} clientes atingido para seu plano.`)
        }
      } else if (type === 'sessions' && item?.client_id) {
        const clientSessions = data.filter((session: any) => session.client_id === item.client_id).length
        if (!canAddSession(clientSessions)) {
          errors.push(`Limite de ${planLimits.maxSessionsPerClient} sessões por cliente atingido.`)
        }
      }
    }

    setValidationErrors(errors)
    return errors.length === 0
  }, [type, data, canAddClient, canAddSession, planLimits])

  // Adicionar item com validação automática
  const addItem = useCallback(async (newItem: Partial<T>) => {
    if (!validateOperation('add', newItem)) {
      toast({
        title: "Limite Atingido",
        description: validationErrors[0],
        variant: "destructive"
      })
      return false
    }

    const tempId = `temp-${Date.now()}`
    
    try {
      setIsLoading(true)
      
      // Adicionar ao cache local imediatamente para responsividade
      const optimisticItem = { ...newItem, id: tempId, user_id: user?.id } as T
      setData(prev => [...prev, optimisticItem])

      // Sincronizar com servidor - será tratado pelo realtime
      await syncData(type)
      
      toast({
        title: "Item Adicionado",
        description: `${type === 'clients' ? 'Cliente' : 'Sessão'} criado com sucesso.`,
      })
      
      return true
    } catch (error) {
      // Reverter otimização em caso de erro
      setData(prev => prev.filter(item => (item as any).id !== tempId))
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [validateOperation, validationErrors, user, syncData, type, toast])

  // Atualizar item
  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      setIsLoading(true)
      
      // Atualização otimista
      setData(prev => prev.map(item => 
        (item as any).id === id ? { ...item, ...updates } : item
      ))

      await syncData(type)
      
      toast({
        title: "Item Atualizado",
        description: "Alterações salvas com sucesso.",
      })
      
      return true
    } catch (error) {
      await loadData() // Recarregar em caso de erro
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [syncData, type, toast, loadData])

  // Remover item
  const removeItem = useCallback(async (id: string) => {
    const originalData = data
    
    try {
      setIsLoading(true)
      
      // Remoção otimista
      setData(prev => prev.filter(item => (item as any).id !== id))

      await syncData(type)
      
      toast({
        title: "Item Removido",
        description: "Item excluído com sucesso.",
      })
      
      return true
    } catch (error) {
      // Reverter em caso de erro
      setData(originalData)
      toast({
        title: "Erro",
        description: "Não foi possível remover o item.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [data, syncData, type, toast])

  // Busca inteligente
  const search = useCallback((query: string, fields: (keyof T)[] = []) => {
    if (!query.trim()) return data

    return data.filter(item => {
      const searchFields = fields.length > 0 ? fields : Object.keys(item as any) as (keyof T)[]
      
      return searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query.toLowerCase())
        }
        return false
      })
    })
  }, [data])

  // Filtros inteligentes
  const filter = useCallback((filters: Record<string, any>) => {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true
        return (item as any)[key] === value
      })
    })
  }, [data])

  // Estatísticas automáticas
  const stats = useCallback(() => {
    const total = data.length
    const recent = data.filter(item => {
      const createdAt = (item as any).created_at
      if (!createdAt) return false
      const itemDate = new Date(createdAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return itemDate > weekAgo
    }).length

    return {
      total,
      recent,
      canAddMore: type === 'clients' ? canAddClient(total) : true,
      limitReached: type === 'clients' ? total >= planLimits.maxClients : false
    }
  }, [data, type, canAddClient, planLimits])

  // Listener para atualizações em tempo real
  useEffect(() => {
    const handleSync = (event: CustomEvent) => {
      setData(event.detail)
    }

    window.addEventListener(`sync-${type}` as any, handleSync)
    return () => window.removeEventListener(`sync-${type}` as any, handleSync)
  }, [type])

  // Carregar dados iniciais
  useEffect(() => {
    loadData()
  }, [loadData, ...dependencies])

  // Auto-refresh baseado em dependências
  useEffect(() => {
    if (autoRefresh && dependencies.length > 0) {
      loadData()
    }
  }, dependencies)

  return {
    data,
    isLoading: isLoading || isSyncing,
    error,
    validationErrors,
    addItem,
    updateItem,
    removeItem,
    search,
    filter,
    stats: stats(),
    refresh: loadData,
    validateOperation
  }
}