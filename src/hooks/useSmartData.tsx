import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
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
  const { canAddClient, canAddSession, planLimits } = useSubscription()
  const { toast } = useToast()
  
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Carregar dados diretamente do Supabase
  const loadData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data: fetchedData, error } = await supabase
        .from(getTableName(type))
        .select(type === 'sessions' ? '*, clients(nome)' : '*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setData(fetchedData as T[] || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [user, type])

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

    try {
      setIsLoading(true)
      
      // Inserir diretamente no Supabase
      const { error } = await supabase
        .from(getTableName(type))
        .insert({ ...newItem as any, user_id: user?.id })

      if (error) throw error
      
      // Recarregar dados
      await loadData()
      
      toast({
        title: "Item Adicionado",
        description: `${type === 'clients' ? 'Cliente' : 'Sessão'} criado com sucesso.`,
      })
      
      return true
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [validateOperation, validationErrors, user, loadData, type, toast])

  // Atualizar item
  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      setIsLoading(true)
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from(getTableName(type))
        .update(updates as any)
        .eq('id', id)

      if (error) throw error
      
      // Recarregar dados
      await loadData()
      
      toast({
        title: "Item Atualizado",
        description: "Alterações salvas com sucesso.",
      })
      
      return true
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadData, type, toast])

  // Remover item
  const removeItem = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      
      // Remover do Supabase
      const { error } = await supabase
        .from(getTableName(type))
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Recarregar dados
      await loadData()
      
      toast({
        title: "Item Removido",
        description: "Item excluído com sucesso.",
      })
      
      return true
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o item.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadData, type, toast])

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

  // Remover listener para sync (não usado mais)
  /*
  useEffect(() => {
    const handleSync = (event: CustomEvent) => {
      setData(event.detail)
    }

    window.addEventListener(`sync-${type}` as any, handleSync)
    return () => window.removeEventListener(`sync-${type}` as any, handleSync)
  }, [type])
  */

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
    isLoading,
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

// Função auxiliar
function getTableName(type: string): 'clients' | 'sessions' {
  switch (type) {
    case 'clients': return 'clients'
    case 'sessions': return 'sessions'
    case 'payments': return 'sessions' // pagamentos são parte das sessões
    default: return 'clients'
  }
}