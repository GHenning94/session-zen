import { useState, useCallback, useMemo, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatTimeForDatabase } from '@/lib/utils'
import {
  GoogleEvent,
  PlatformSession,
  SyncConflict,
  ConflictDiff,
  ConflictField,
  ConflictResolution,
} from '@/types/googleCalendar'

interface UseConflictDetectionProps {
  getAccessToken?: () => Promise<string | null>
}

export const useConflictDetection = (props?: UseConflictDetectionProps) => {
  const getAccessToken = props?.getAccessToken
  const { toast } = useToast()
  const { user } = useAuth()
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [isResolving, setIsResolving] = useState<string | null>(null)
  
  // Track notified conflicts to avoid duplicate notifications
  const notifiedConflictIds = useRef<Set<string>>(new Set())

  // Comparar data/hora entre plataforma e Google
  const compareDateTime = (session: PlatformSession, event: GoogleEvent): ConflictDiff[] => {
    const diffs: ConflictDiff[] = []
    
    const googleStart = event.start.dateTime || event.start.date
    if (!googleStart) return diffs
    
    const googleDate = new Date(googleStart)
    const googleDateStr = format(googleDate, 'yyyy-MM-dd')
    const googleTimeStr = event.start.dateTime 
      ? format(googleDate, 'HH:mm:ss')
      : '09:00:00'
    
    // Normalizar horário da sessão para comparação
    const sessionTime = session.horario.length === 5 
      ? `${session.horario}:00` 
      : session.horario
    
    if (session.data !== googleDateStr) {
      diffs.push({
        field: 'date',
        platformValue: session.data,
        googleValue: googleDateStr,
      })
    }
    
    if (sessionTime !== googleTimeStr) {
      diffs.push({
        field: 'time',
        platformValue: sessionTime,
        googleValue: googleTimeStr,
      })
    }
    
    return diffs
  }

  // Comparar descrição/anotações
  const compareDescription = (session: PlatformSession, event: GoogleEvent): ConflictDiff[] => {
    const diffs: ConflictDiff[] = []
    
    const platformDesc = (session.anotacoes || '').trim()
    const googleDesc = (event.description || '').trim()
    
    if (platformDesc !== googleDesc) {
      diffs.push({
        field: 'description',
        platformValue: platformDesc,
        googleValue: googleDesc,
      })
    }
    
    return diffs
  }

  // Comparar localização
  const compareLocation = (session: PlatformSession, event: GoogleEvent): ConflictDiff[] => {
    const diffs: ConflictDiff[] = []
    
    const platformLocation = (session.google_location || '').trim()
    const googleLocation = (event.location || '').trim()
    
    if (platformLocation !== googleLocation) {
      diffs.push({
        field: 'location',
        platformValue: platformLocation,
        googleValue: googleLocation,
      })
    }
    
    return diffs
  }

  // Detectar conflitos entre uma sessão e seu evento Google correspondente
  const detectConflictForSession = useCallback((
    session: PlatformSession,
    googleEvent: GoogleEvent
  ): SyncConflict | null => {
    if (session.google_sync_type !== 'espelhado') return null
    
    const differences: ConflictDiff[] = [
      ...compareDateTime(session, googleEvent),
      ...compareDescription(session, googleEvent),
      ...compareLocation(session, googleEvent),
    ]
    
    if (differences.length === 0) return null
    
    // Determinar severidade baseado no tipo de diferenças
    const hasDateTimeConflict = differences.some(d => d.field === 'date' || d.field === 'time')
    const severity = hasDateTimeConflict ? 'high' : differences.length > 1 ? 'medium' : 'low'
    
    return {
      id: `conflict-${session.id}-${Date.now()}`,
      sessionId: session.id,
      googleEventId: googleEvent.id,
      sessionData: session,
      googleEventData: googleEvent,
      differences,
      detectedAt: new Date().toISOString(),
      severity,
    }
  }, [])

  // Criar notificação no banco de dados
  const createConflictNotification = useCallback(async (
    conflict: SyncConflict,
    isNew: boolean = true
  ) => {
    if (!user) return
    
    // Skip if already notified for this session conflict
    const conflictKey = `${conflict.sessionId}-${conflict.severity}`
    if (notifiedConflictIds.current.has(conflictKey)) return
    
    const clientName = conflict.sessionData.clients?.nome || 'Cliente'
    const sessionDate = format(new Date(conflict.sessionData.data), "d 'de' MMMM", { locale: ptBR })
    const severityLabels = { high: 'Alta', medium: 'Média', low: 'Baixa' }
    
    const titulo = conflict.severity === 'high' 
      ? `⚠️ Conflito urgente: ${clientName}`
      : `Conflito de sincronização: ${clientName}`
    
    const fieldsChanged = conflict.differences.map(d => {
      const labels: Record<ConflictField, string> = {
        date: 'data',
        time: 'horário',
        description: 'descrição',
        location: 'localização',
        attendees: 'participantes'
      }
      return labels[d.field]
    }).join(', ')
    
    const conteudo = `Detectadas diferenças em ${fieldsChanged} na sessão de ${sessionDate}. ` +
      `Prioridade: ${severityLabels[conflict.severity]}. ` +
      `Acesse Integrações > Google Calendar para resolver.`
    
    try {
      await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          titulo,
          conteudo,
          lida: false
        }])
      
      notifiedConflictIds.current.add(conflictKey)
    } catch (error) {
      console.error('Erro ao criar notificação de conflito:', error)
    }
  }, [user])

  // Detectar todos os conflitos
  const detectAllConflicts = useCallback(async (
    mirroredSessions: PlatformSession[],
    googleEvents: GoogleEvent[]
  ) => {
    setIsDetecting(true)
    const detectedConflicts: SyncConflict[] = []
    const newConflicts: SyncConflict[] = []
    
    try {
      for (const session of mirroredSessions) {
        if (session.google_sync_type !== 'espelhado' || !session.google_event_id) continue
        
        const matchingEvent = googleEvents.find(e => e.id === session.google_event_id)
        if (!matchingEvent) continue
        
        const conflict = detectConflictForSession(session, matchingEvent)
        if (conflict) {
          detectedConflicts.push(conflict)
          
          // Check if this is a new conflict (not already notified)
          const conflictKey = `${conflict.sessionId}-${conflict.severity}`
          if (!notifiedConflictIds.current.has(conflictKey)) {
            newConflicts.push(conflict)
          }
        }
      }
      
      setConflicts(detectedConflicts)
      
      // Create notifications for new conflicts
      if (newConflicts.length > 0) {
        const highPriorityConflicts = newConflicts.filter(c => c.severity === 'high')
        const otherConflicts = newConflicts.filter(c => c.severity !== 'high')
        
        // Create individual notifications for high priority conflicts
        for (const conflict of highPriorityConflicts) {
          await createConflictNotification(conflict)
        }
        
        // Create a single summary notification for medium/low priority if multiple
        if (otherConflicts.length > 0) {
          if (otherConflicts.length === 1) {
            await createConflictNotification(otherConflicts[0])
          } else {
            // Create summary notification
            const summaryKey = `summary-${Date.now()}`
            if (!notifiedConflictIds.current.has(summaryKey) && user) {
              try {
                await supabase
                  .from('notifications')
                  .insert([{
                    user_id: user.id,
                    titulo: `${otherConflicts.length} conflitos de sincronização`,
                    conteudo: `Foram detectados ${otherConflicts.length} conflitos de baixa/média prioridade em sessões espelhadas com o Google Calendar. Acesse Integrações para revisar.`,
                    lida: false
                  }])
                
                notifiedConflictIds.current.add(summaryKey)
                otherConflicts.forEach(c => {
                  notifiedConflictIds.current.add(`${c.sessionId}-${c.severity}`)
                })
              } catch (error) {
                console.error('Erro ao criar notificação resumo:', error)
              }
            }
          }
        }
      }
      
      // Show toast for user feedback
      if (detectedConflicts.length > 0) {
        const highCount = detectedConflicts.filter(c => c.severity === 'high').length
        const newCount = newConflicts.length
        
        toast({
          title: `${detectedConflicts.length} conflito(s) detectado(s)`,
          description: newCount > 0 
            ? `${newCount} novo(s) conflito(s)${highCount > 0 ? `, ${highCount} de alta prioridade` : ''}.`
            : 'Revise os conflitos para manter seus dados sincronizados.',
          variant: highCount > 0 ? 'destructive' : 'default',
        })
      }
      
      return detectedConflicts
    } catch (error) {
      console.error('Erro ao detectar conflitos:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível detectar conflitos.',
        variant: 'destructive',
      })
      return []
    } finally {
      setIsDetecting(false)
    }
  }, [detectConflictForSession, createConflictNotification, user, toast])

  // Resolver conflito mantendo dados da plataforma
  const resolveKeepPlatform = useCallback(async (
    conflict: SyncConflict,
    accessToken: string
  ): Promise<boolean> => {
    try {
      const session = conflict.sessionData
      const startDateTime = new Date(`${session.data}T${session.horario}`)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

      const googleEvent = {
        summary: session.clients?.nome || 'Cliente',
        description: session.anotacoes || '',
        location: session.google_location || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${conflict.googleEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent)
        }
      )

      if (!response.ok) throw new Error('Failed to update Google event')

      await supabase
        .from('sessions')
        .update({ google_last_synced: new Date().toISOString() })
        .eq('id', session.id)

      return true
    } catch (error) {
      console.error('Erro ao resolver conflito (keep platform):', error)
      return false
    }
  }, [])

  // Resolver conflito mantendo dados do Google
  const resolveKeepGoogle = useCallback(async (
    conflict: SyncConflict
  ): Promise<boolean> => {
    try {
      const event = conflict.googleEventData
      const startDateTime = event.start.dateTime || event.start.date
      if (!startDateTime) return false
      
      const googleDate = new Date(startDateTime)
      const eventDate = format(googleDate, 'yyyy-MM-dd')
      const eventTime = event.start.dateTime 
        ? format(googleDate, 'HH:mm')
        : '09:00'

      const { error } = await supabase
        .from('sessions')
        .update({
          data: eventDate,
          horario: formatTimeForDatabase(eventTime),
          anotacoes: event.description || '',
          google_location: event.location || null,
          google_last_synced: new Date().toISOString(),
        })
        .eq('id', conflict.sessionId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erro ao resolver conflito (keep Google):', error)
      return false
    }
  }, [])

  // Resolver conflito com merge personalizado
  const resolveWithMerge = useCallback(async (
    conflict: SyncConflict,
    mergedData: {
      date?: string
      time?: string
      description?: string
      location?: string
    },
    accessToken: string
  ): Promise<boolean> => {
    try {
      const session = conflict.sessionData
      
      // Atualizar sessão na plataforma
      const { error } = await supabase
        .from('sessions')
        .update({
          data: mergedData.date || session.data,
          horario: formatTimeForDatabase(mergedData.time || session.horario.substring(0, 5)),
          anotacoes: mergedData.description ?? session.anotacoes,
          google_location: mergedData.location ?? session.google_location,
          google_last_synced: new Date().toISOString(),
        })
        .eq('id', session.id)

      if (error) throw error

      // Atualizar evento no Google
      const startDateTime = new Date(`${mergedData.date || session.data}T${mergedData.time || session.horario}`)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

      const googleEvent = {
        summary: session.clients?.nome || 'Cliente',
        description: mergedData.description ?? session.anotacoes ?? '',
        location: mergedData.location ?? session.google_location ?? '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${conflict.googleEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent)
        }
      )

      if (!response.ok) throw new Error('Failed to update Google event')
      return true
    } catch (error) {
      console.error('Erro ao resolver conflito (merge):', error)
      return false
    }
  }, [])

  // Resolver um conflito
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: ConflictResolution,
    mergedData?: {
      date?: string
      time?: string
      description?: string
      location?: string
    }
  ): Promise<boolean> => {
    const conflict = conflicts.find(c => c.id === conflictId)
    if (!conflict) return false
    
    setIsResolving(conflictId)
    
    try {
      // Obter token usando a função passada ou localStorage como fallback
      let accessToken: string | null = null
      if (getAccessToken) {
        accessToken = await getAccessToken()
      } else {
        accessToken = localStorage.getItem('google_access_token')
      }
      
      if (!accessToken && resolution !== 'dismiss' && resolution !== 'keep_google') {
        toast({
          title: 'Erro de conexão',
          description: 'Reconecte-se ao Google Calendar para resolver este conflito.',
          variant: 'destructive',
        })
        return false
      }
      
      let success = false
      
      switch (resolution) {
        case 'keep_platform':
          success = await resolveKeepPlatform(conflict, accessToken!)
          break
        case 'keep_google':
          success = await resolveKeepGoogle(conflict)
          break
        case 'merge':
          if (!mergedData) return false
          success = await resolveWithMerge(conflict, mergedData, accessToken!)
          break
        case 'dismiss':
          success = true
          break
      }
      
      if (success) {
        // Clear notified state for this conflict so it can be re-notified if it recurs
        const conflictKey = `${conflict.sessionId}-${conflict.severity}`
        notifiedConflictIds.current.delete(conflictKey)
        
        setConflicts(prev => prev.filter(c => c.id !== conflictId))
        toast({
          title: 'Conflito resolvido',
          description: resolution === 'dismiss' 
            ? 'O conflito foi ignorado.'
            : 'Os dados foram sincronizados com sucesso.',
        })
      }
      
      return success
    } catch (error) {
      console.error('Erro ao resolver conflito:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível resolver o conflito.',
        variant: 'destructive',
      })
      return false
    } finally {
      setIsResolving(null)
    }
  }, [conflicts, resolveKeepPlatform, resolveKeepGoogle, resolveWithMerge, toast])

  // Resolver todos os conflitos com mesma estratégia
  const resolveAllConflicts = useCallback(async (
    resolution: 'keep_platform' | 'keep_google'
  ): Promise<number> => {
    let successCount = 0
    
    for (const conflict of conflicts) {
      const success = await resolveConflict(conflict.id, resolution)
      if (success) successCount++
    }
    
    return successCount
  }, [conflicts, resolveConflict])

  // Limpar conflito específico da lista
  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId))
  }, [])

  // Limpar todos os conflitos
  const clearAllConflicts = useCallback(() => {
    setConflicts([])
    notifiedConflictIds.current.clear()
  }, [])

  // Estatísticas de conflitos
  const conflictStats = useMemo(() => ({
    total: conflicts.length,
    high: conflicts.filter(c => c.severity === 'high').length,
    medium: conflicts.filter(c => c.severity === 'medium').length,
    low: conflicts.filter(c => c.severity === 'low').length,
  }), [conflicts])

  return {
    conflicts,
    conflictStats,
    isDetecting,
    isResolving,
    detectAllConflicts,
    resolveConflict,
    resolveAllConflicts,
    dismissConflict,
    clearAllConflicts,
  }
}
