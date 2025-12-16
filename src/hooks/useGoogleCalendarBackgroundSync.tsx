import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

const SYNC_INTERVAL = 15 * 60 * 1000 // 15 minutos em milissegundos
const STORAGE_KEY = 'google_calendar_auto_sync'

export interface BackgroundSyncResult {
  timestamp: Date
  mirroredUpdated: number
  conflicts: number
  cancelled: number
}

export const useGoogleCalendarBackgroundSync = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<BackgroundSyncResult | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Carregar configuração do localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`)
      setIsAutoSyncEnabled(stored === 'true')
    }
  }, [user])

  // Função de sincronização em background
  const runBackgroundSync = useCallback(async () => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !user || isSyncing) return

    setIsSyncing(true)
    console.log('[BackgroundSync] Iniciando sincronização automática...')

    try {
      let mirroredUpdated = 0
      let conflicts = 0
      let cancelled = 0

      // 1. Buscar sessões da plataforma
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: platformSessions, error } = await supabase
        .from('sessions')
        .select(`
          id, data, horario, status, anotacoes, client_id,
          google_event_id, google_sync_type, google_last_synced,
          clients (id, nome, email)
        `)
        .eq('user_id', user.id)
        .not('google_event_id', 'is', null)

      if (error) {
        console.error('[BackgroundSync] Erro ao buscar sessões:', error)
        return
      }

      // 2. Verificar eventos cancelados
      const syncedSessions = platformSessions?.filter(s => 
        s.google_event_id && 
        (s.google_sync_type === 'mirrored' || s.google_sync_type === 'sent' || s.google_sync_type === 'imported')
      ) || []

      for (const session of syncedSessions) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${session.google_event_id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            }
          )

          if (response.status === 404) {
            await supabase
              .from('sessions')
              .update({ 
                google_sync_type: 'cancelled',
                google_last_synced: new Date().toISOString()
              })
              .eq('id', session.id)
            cancelled++
          } else if (response.ok) {
            const eventData = await response.json()
            if (eventData.status === 'cancelled') {
              await supabase
                .from('sessions')
                .update({ 
                  google_sync_type: 'cancelled',
                  google_last_synced: new Date().toISOString()
                })
                .eq('id', session.id)
              cancelled++
            }
          }
        } catch (error) {
          console.error(`[BackgroundSync] Erro ao verificar evento ${session.google_event_id}:`, error)
        }
      }

      // 3. Sincronizar sessões espelhadas
      const mirroredSessions = platformSessions?.filter(s => s.google_sync_type === 'mirrored') || []
      const { format } = await import('date-fns')
      const { formatTimeForDatabase } = await import('@/lib/utils')

      for (const session of mirroredSessions) {
        if (!session.google_event_id) continue

        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${session.google_event_id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            }
          )

          if (!response.ok) continue

          const googleEvent = await response.json()
          const googleStart = new Date(googleEvent.start.dateTime || googleEvent.start.date)
          const googleDate = googleStart.toISOString().split('T')[0]
          const googleTime = format(googleStart, "HH:mm")
          
          const platformDate = session.data
          const platformTime = session.horario.substring(0, 5)

          const googleUpdated = new Date(googleEvent.updated)
          const platformSynced = session.google_last_synced ? new Date(session.google_last_synced) : new Date(0)

          if (googleDate !== platformDate || googleTime !== platformTime) {
            if (googleUpdated > platformSynced) {
              await supabase
                .from('sessions')
                .update({
                  data: googleDate,
                  horario: formatTimeForDatabase(googleTime),
                  anotacoes: googleEvent.description || session.anotacoes,
                  google_location: googleEvent.location || null,
                  google_last_synced: new Date().toISOString()
                })
                .eq('id', session.id)
              mirroredUpdated++
            } else {
              conflicts++
            }
          }
        } catch (error) {
          console.error(`[BackgroundSync] Erro ao sincronizar sessão ${session.id}:`, error)
        }
      }

      const result: BackgroundSyncResult = {
        timestamp: new Date(),
        mirroredUpdated,
        conflicts,
        cancelled
      }

      setLastSyncResult(result)
      console.log('[BackgroundSync] Sincronização concluída:', result)

      // Mostrar notificação apenas se houver mudanças
      if (mirroredUpdated > 0 || conflicts > 0 || cancelled > 0) {
        toast({
          title: "Sincronização automática",
          description: `${mirroredUpdated} atualizada(s), ${conflicts} conflito(s), ${cancelled} cancelada(s)`,
        })
      }
    } catch (error) {
      console.error('[BackgroundSync] Erro geral:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [user, isSyncing, toast])

  // Ativar/desativar sync automático
  const toggleAutoSync = useCallback((enabled: boolean) => {
    if (!user) return

    setIsAutoSyncEnabled(enabled)
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, enabled.toString())

    if (enabled) {
      toast({
        title: "Sincronização automática ativada",
        description: "Verificações a cada 15 minutos",
      })
      // Executar imediatamente ao ativar
      runBackgroundSync()
    } else {
      toast({
        title: "Sincronização automática desativada",
      })
    }
  }, [user, toast, runBackgroundSync])

  // Gerenciar intervalo
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isAutoSyncEnabled && user) {
      console.log('[BackgroundSync] Iniciando timer de 15 minutos')
      intervalRef.current = setInterval(runBackgroundSync, SYNC_INTERVAL)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAutoSyncEnabled, user, runBackgroundSync])

  // Executar sync manual
  const manualSync = useCallback(async () => {
    await runBackgroundSync()
  }, [runBackgroundSync])

  return {
    isAutoSyncEnabled,
    toggleAutoSync,
    lastSyncResult,
    isSyncing,
    manualSync
  }
}
