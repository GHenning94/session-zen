import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { formatTimeForDatabase } from '@/lib/utils'

export interface CalendarSession {
  id: string
  user_id: string
  client_id: string
  data: string
  horario: string
  valor?: number
  anotacoes?: string
  status: string
  metodo_pagamento?: string
  created_at: string
  updated_at: string
}

export interface CalendarClient {
  id: string
  nome: string
  email?: string
  telefone?: string
  user_id: string
  ativo: boolean
}

export const useCalendarData = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const { 
    isSignedIn: isGoogleConnected, 
    events: googleEvents, 
    loading: googleLoading,
    connectToGoogle,
    disconnectFromGoogle,
    loadEvents: loadGoogleEvents,
    createGoogleEvent
  } = useGoogleCalendar()

  const [sessions, setSessions] = useState<CalendarSession[]>([])
  const [clients, setClients] = useState<CalendarClient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Carregar dados do Supabase
  const loadData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Carregar sessões e clientes (campos otimizados)
      const [sessionsResult, clientsResult] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, user_id, client_id, data, horario, valor, anotacoes, status, metodo_pagamento, created_at, updated_at, google_event_id, google_sync_type')
          .eq('user_id', user.id)
          .order('data', { ascending: true }),
        supabase
          .from('clients')
          .select('id, nome, email, telefone, user_id, ativo')
          .eq('user_id', user.id)
          .order('nome', { ascending: true })
      ])

      if (sessionsResult.error) {
        console.error('Erro ao carregar sessões:', sessionsResult.error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar as sessões.",
          variant: "destructive"
        })
      } else {
        setSessions(sessionsResult.data || [])
      }

      if (clientsResult.error) {
        console.error('Erro ao carregar clientes:', clientsResult.error)
        toast({
          title: "Erro", 
          description: "Não foi possível carregar os clientes.",
          variant: "destructive"
        })
      } else {
        setClients(clientsResult.data || [])
      }

      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar dados.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  // Criar nova sessão
  const createSession = useCallback(async (sessionData: Partial<CalendarSession>) => {
    if (!user) return false

    try {
      setIsLoading(true)
      
      const newSession = {
        user_id: user.id,
        client_id: sessionData.client_id!,
        data: sessionData.data!,
        horario: formatTimeForDatabase(sessionData.horario!),
        valor: sessionData.valor || null,
        anotacoes: sessionData.anotacoes || null,
        status: sessionData.status || 'agendada'
      }

      const { data: createdSession, error } = await supabase
        .from('sessions')
        .insert([newSession])
        .select()
        .single()

      if (error) throw error

      // Criar evento no Google Calendar se conectado
      if (isGoogleConnected && createdSession) {
        const client = clients.find(c => c.id === sessionData.client_id)
        const clientName = client?.nome || 'Cliente'
        
        const [year, month, day] = sessionData.data!.split('-')
        const [hours, minutes] = sessionData.horario!.split(':')
        
        const startDateTime = new Date(
          parseInt(year), 
          parseInt(month) - 1, 
          parseInt(day), 
          parseInt(hours), 
          parseInt(minutes)
        )
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // 1 hora depois

        try {
          await createGoogleEvent({
            summary: `Sessão - ${clientName}`,
            description: sessionData.anotacoes || `Sessão agendada com ${clientName}`,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString()
          })
        } catch (googleError) {
          console.error('Erro ao criar evento no Google:', googleError)
          // Não falhar a operação se o Google falhar
        }
      }

      toast({
        title: "Sessão criada!",
        description: "A sessão foi agendada com sucesso.",
      })

      await loadData()
      return true
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user, clients, isGoogleConnected, createGoogleEvent, loadData, toast])

  // Atualizar sessão
  const updateSession = useCallback(async (sessionId: string, updates: Partial<CalendarSession>) => {
    if (!user) return false

    try {
      setIsLoading(true)

      // Formatar horário se presente nos updates
      const formattedUpdates = {
        ...updates,
        ...(updates.horario && { horario: formatTimeForDatabase(updates.horario) })
      }

      const { error } = await supabase
        .from('sessions')
        .update(formattedUpdates)
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Sessão atualizada!",
        description: "As alterações foram salvas com sucesso.",
      })

      await loadData()
      return true
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a sessão.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user, loadData, toast])

  // Deletar sessão
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return false

    try {
      setIsLoading(true)

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Sessão cancelada",
        description: "A sessão foi removida da sua agenda.",
      })

      await loadData()
      return true
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a sessão.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user, loadData, toast])

  // Mover sessão (drag and drop)
  const moveSession = useCallback(async (sessionId: string, newDate: string, newTime?: string) => {
    if (!user) return false

    try {
      setIsLoading(true)

      const updates: Partial<CalendarSession> = { data: newDate }
      if (newTime) {
        updates.horario = formatTimeForDatabase(newTime)
      }

      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Sessão reagendada",
        description: "A sessão foi movida com sucesso.",
      })

      await loadData()
      return true
    } catch (error) {
      console.error('Erro ao mover sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível reagendar a sessão.",
        variant: "destructive"
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user, loadData, toast])

  // Obter nome do cliente
  const getClientName = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente não encontrado'
  }, [clients])

  // REMOVIDO: Realtime agora é gerenciado pelo useGlobalRealtime
  // Isso evita canais duplicados e otimiza conexões

  // Carregar dados inicialmente
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  return {
    // Dados
    sessions,
    clients,
    googleEvents,
    isLoading: isLoading || googleLoading,
    lastSyncTime,
    
    // Google Calendar
    isGoogleConnected,
    connectToGoogle,
    disconnectFromGoogle,
    loadGoogleEvents,
    
    // Operações CRUD
    createSession,
    updateSession,
    deleteSession,
    moveSession,
    
    // Helpers
    getClientName,
    refreshData: loadData
  }
}