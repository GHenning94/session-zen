import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { formatTimeForDatabase } from "@/lib/utils"
import { 
  GoogleEvent, 
  PlatformSession, 
  GoogleSyncType, 
  RecurringEventSeries,
  isRecurringEvent,
  getRecurringMasterId 
} from "@/types/googleCalendar"
import { format } from "date-fns"

// Configurações Google OAuth
const GOOGLE_CLIENT_ID = "1039606606801-9ofdjvl0abgcr808q3i1jgmb6kojdk9d.apps.googleusercontent.com"
const SCOPES = 'https://www.googleapis.com/auth/calendar'

export const useGoogleCalendarSync = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([])
  const [platformSessions, setPlatformSessions] = useState<PlatformSession[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [selectedGoogleEvents, setSelectedGoogleEvents] = useState<Set<string>>(new Set())
  const [selectedPlatformSessions, setSelectedPlatformSessions] = useState<Set<string>>(new Set())

  // Inicializar Google API
  const initializeGoogleAPI = async () => {
    if (typeof window === 'undefined') return
    
    try {
      if ((window as any).google?.accounts) {
        setIsInitialized(true)
        return
      }

      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsInitialized(true))
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      
      script.onload = () => {
        console.log('Google API carregada com sucesso')
        setIsInitialized(true)
      }
      
      script.onerror = () => {
        console.error('Erro ao carregar Google API')
        toast({
          title: "Erro",
          description: "Falha ao carregar API do Google",
          variant: "destructive"
        })
      }
      
      document.head.appendChild(script)
    } catch (error) {
      console.error('Erro ao inicializar Google API:', error)
    }
  }

  useEffect(() => {
    initializeGoogleAPI()
  }, [])

  // Conectar com Google
  const connectToGoogle = async () => {
    if (!isInitialized) {
      toast({
        title: "Aguarde",
        description: "Inicializando conexão com Google...",
      })
      return
    }

    try {
      setLoading(true)
      
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.access_token) {
            localStorage.setItem('google_access_token', response.access_token)
            setIsSignedIn(true)
            toast({
              title: "Conectado!",
              description: "Google Calendar conectado com sucesso.",
            })
            await loadAllData()
          }
        },
      })
      
      tokenClient.requestAccessToken()
    } catch (error) {
      console.error('Erro ao conectar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível conectar com o Google Calendar.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Desconectar do Google (preserva sessões como locais)
  const disconnectFromGoogle = async () => {
    if (user) {
      // Converter todas as sessões sincronizadas para locais (preservar dados)
      const { error } = await supabase
        .from('sessions')
        .update({
          google_sync_type: 'local',
          google_event_id: null,
          google_html_link: null,
          google_last_synced: null
        })
        .eq('user_id', user.id)
        .not('google_sync_type', 'is', null)

      if (error) {
        console.error('Erro ao preservar sessões:', error)
      }
    }

    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_ignored_events')
    setIsSignedIn(false)
    setGoogleEvents([])
    setSelectedGoogleEvents(new Set())
    
    toast({
      title: "Desconectado",
      description: "Google Calendar desconectado. Suas sessões foram preservadas.",
    })
  }

  // Obter token de acesso válido (com verificação)
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return null

    // Verificar se token está válido fazendo uma chamada simples
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (response.ok) {
        return accessToken
      }

      if (response.status === 401) {
        // Token expirado
        localStorage.removeItem('google_access_token')
        setIsSignedIn(false)
        toast({
          title: "Sessão expirada",
          description: "Reconecte-se ao Google Calendar.",
          variant: "destructive"
        })
        return null
      }

      return accessToken
    } catch (error) {
      console.error('Erro ao verificar token:', error)
      return accessToken // Retorna o token mesmo em caso de erro de rede
    }
  }, [toast])

  // Carregar eventos do Google (hoje até 30 dias à frente)
  const loadGoogleEvents = async () => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return

    try {
      // Buscar eventos de hoje até 30 dias à frente
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const timeMin = today.toISOString()
      
      const thirtyDaysAhead = new Date()
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30)
      thirtyDaysAhead.setHours(23, 59, 59, 999)
      const timeMax = thirtyDaysAhead.toISOString()
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=500&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('google_access_token')
          setIsSignedIn(false)
          toast({
            title: "Token expirado",
            description: "Reconecte-se ao Google Calendar.",
            variant: "destructive"
          })
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setGoogleEvents(data.items || [])
      return data.items || []
    } catch (error) {
      console.error('Erro ao carregar eventos do Google:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos do Google Calendar.",
        variant: "destructive"
      })
    }
  }

  // Carregar sessões da plataforma
  const loadPlatformSessions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, data, horario, status, valor, anotacoes, client_id, package_id, recurring_session_id,
          google_event_id, google_sync_type, google_ignored, google_attendees, google_location,
          google_html_link, google_recurrence_id, google_last_synced,
          clients (id, nome, email, avatar_url)
        `)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error
      setPlatformSessions((data as any) || [])
      return data || []
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as sessões.",
        variant: "destructive"
      })
    }
  }

  // Carregar todos os dados
  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadGoogleEvents(), loadPlatformSessions()])
    } finally {
      setLoading(false)
    }
  }

  // Importar evento do Google
  // editable = false: somente leitura (google_sync_type: 'importado')
  // editable = true: cópia editável independente (sem google_sync_type)
  const importGoogleEvent = async (event: GoogleEvent, editable = false): Promise<boolean> => {
    if (!user) return false

    setSyncing(event.id)
    try {
      const startDateTime = event.start.dateTime || event.start.date
      const eventDate = new Date(startDateTime!).toISOString().split('T')[0]
      const eventTime = event.start.dateTime 
        ? format(new Date(startDateTime!), "HH:mm")
        : "09:00"

      let clientId = null

      // Sempre tenta criar/encontrar cliente baseado nos participantes
      if (event.attendees && event.attendees.length > 0) {
        const attendee = event.attendees[0]
        const clientName = attendee.displayName || event.summary.split(' - ')[1] || event.summary
        const clientEmail = attendee.email

        // Verificar se cliente já existe
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .eq('email', clientEmail)
          .maybeSingle()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert([{
              user_id: user.id,
              nome: clientName,
              email: clientEmail,
              telefone: '',
              dados_clinicos: event.description || ''
            }])
            .select()
            .single()

          if (clientError) throw clientError
          clientId = newClient.id
        }
      }

      // Se não temos cliente, criar um temporário
      if (!clientId) {
        const clientName = event.summary.split(' - ')[1] || event.summary
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            user_id: user.id,
            nome: clientName,
            email: null,
            telefone: '',
            dados_clinicos: editable 
              ? `Criado a partir de evento do Google: ${event.description || ''}`
              : `Importado do Google Calendar: ${event.description || ''}`
          }])
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Buscar valor padrão da configuração do usuário
      const { data: config } = await supabase
        .from('configuracoes')
        .select('valor_padrao')
        .eq('user_id', user.id)
        .maybeSingle()

      const valorPadrao = config?.valor_padrao || 0

      // Criar sessão - se editável, não vincula ao Google (sessão independente)
      const sessionData: any = {
        user_id: user.id,
        client_id: clientId,
        data: eventDate,
        horario: formatTimeForDatabase(eventTime),
        status: 'agendada',
        valor: valorPadrao,
        anotacoes: event.description || ''
      }

      // Se NÃO é editável, é somente leitura - vincula ao Google
      if (!editable) {
        sessionData.google_event_id = event.id
        sessionData.google_sync_type = 'importado' as GoogleSyncType
        sessionData.google_attendees = event.attendees || []
        sessionData.google_location = event.location || null
        sessionData.google_html_link = event.htmlLink
        sessionData.google_recurrence_id = event.recurringEventId || null
        sessionData.google_last_synced = new Date().toISOString()
      }

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert([sessionData])

      if (sessionError) throw sessionError

      toast({
        title: editable ? "Cópia criada!" : "Evento importado!",
        description: editable 
          ? `"${event.summary}" foi copiado como sessão editável.`
          : `"${event.summary}" foi importado (somente leitura).`,
      })

      await loadPlatformSessions()
      return true
    } catch (error) {
      console.error('Erro ao importar evento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível importar o evento.",
        variant: "destructive"
      })
      return false
    } finally {
      setSyncing(null)
    }
  }

  // Espelhar evento (sincronização bidirecional)
  const mirrorGoogleEvent = async (event: GoogleEvent): Promise<boolean> => {
    if (!user) return false

    setSyncing(event.id)
    try {
      // Primeiro importa, depois marca como espelhado
      const startDateTime = event.start.dateTime || event.start.date
      const eventDate = new Date(startDateTime!).toISOString().split('T')[0]
      const eventTime = event.start.dateTime 
        ? format(new Date(startDateTime!), "HH:mm")
        : "09:00"

      // Criar cliente temporário
      const clientName = event.summary.split(' - ')[1] || event.summary
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert([{
          user_id: user.id,
          nome: clientName,
          email: event.attendees?.[0]?.email || null,
          telefone: '',
          dados_clinicos: `Espelhado do Google Calendar: ${event.description || ''}`
        }])
        .select()
        .single()

      if (clientError) throw clientError

      // Buscar valor padrão
      const { data: config } = await supabase
        .from('configuracoes')
        .select('valor_padrao')
        .eq('user_id', user.id)
        .maybeSingle()

      const valorPadrao = config?.valor_padrao || 0

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          user_id: user.id,
          client_id: newClient.id,
          data: eventDate,
          horario: formatTimeForDatabase(eventTime),
          status: 'agendada',
          valor: valorPadrao,
          anotacoes: event.description || '',
          google_event_id: event.id,
          google_sync_type: 'espelhado' as GoogleSyncType,
          google_attendees: event.attendees || [],
          google_location: event.location || null,
          google_html_link: event.htmlLink,
          google_recurrence_id: event.recurringEventId || null,
          google_last_synced: new Date().toISOString()
        }])

      if (sessionError) throw sessionError

      toast({
        title: "Espelhamento ativado!",
        description: `"${event.summary}" será sincronizado bidirecionalmente.`,
      })

      await loadPlatformSessions()
      return true
    } catch (error) {
      console.error('Erro ao espelhar evento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível espelhar o evento.",
        variant: "destructive"
      })
      return false
    } finally {
      setSyncing(null)
    }
  }

  // Ignorar evento do Google
  const ignoreGoogleEvent = async (eventId: string): Promise<boolean> => {
    // Marca localmente como ignorado (armazenar no localStorage ou na sessão)
    const ignoredEvents = JSON.parse(localStorage.getItem('google_ignored_events') || '[]')
    if (!ignoredEvents.includes(eventId)) {
      ignoredEvents.push(eventId)
      localStorage.setItem('google_ignored_events', JSON.stringify(ignoredEvents))
    }
    
    toast({
      title: "Evento ignorado",
      description: "O evento não aparecerá mais na lista.",
    })
    
    return true
  }

  // Marcar participantes do evento como clientes
  const markAttendeesAsClients = async (event: GoogleEvent): Promise<number> => {
    if (!user || !event.attendees || event.attendees.length === 0) {
      toast({
        title: "Sem participantes",
        description: "Este evento não tem participantes para adicionar como clientes.",
        variant: "destructive"
      })
      return 0
    }

    setSyncing(event.id)
    let createdCount = 0

    try {
      for (const attendee of event.attendees) {
        const clientName = attendee.displayName || attendee.email.split('@')[0]
        const clientEmail = attendee.email

        // Verificar se cliente já existe
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .eq('email', clientEmail)
          .maybeSingle()

        if (!existingClient) {
          const { error: clientError } = await supabase
            .from('clients')
            .insert([{
              user_id: user.id,
              nome: clientName,
              email: clientEmail,
              telefone: '',
              dados_clinicos: `Adicionado automaticamente do evento: ${event.summary}`
            }])

          if (!clientError) {
            createdCount++
          }
        }
      }

      toast({
        title: "Clientes adicionados!",
        description: createdCount > 0 
          ? `${createdCount} novo(s) cliente(s) foram adicionados à sua lista.`
          : "Todos os participantes já estão na sua lista de clientes.",
      })

      return createdCount
    } catch (error) {
      console.error('Erro ao adicionar clientes:', error)
      toast({
        title: "Erro",
        description: "Não foi possível adicionar os clientes.",
        variant: "destructive"
      })
      return 0
    } finally {
      setSyncing(null)
    }
  }

  // Verificar eventos cancelados no Google
  const checkCancelledEvents = async (): Promise<number> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !user) return 0

    try {
      // Buscar sessões que têm google_event_id
      const syncedSessions = platformSessions.filter(s => 
        s.google_event_id && (s.google_sync_type === 'espelhado' || s.google_sync_type === 'enviado' || s.google_sync_type === 'importado')
      )

      let cancelledCount = 0

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
            // Evento foi excluído no Google
            await supabase
              .from('sessions')
              .update({ 
                google_sync_type: 'cancelado',
                google_last_synced: new Date().toISOString()
              })
              .eq('id', session.id)
            cancelledCount++
            continue
          }

          if (response.ok) {
            const eventData = await response.json()
            if (eventData.status === 'cancelled') {
              await supabase
                .from('sessions')
                .update({ 
                  google_sync_type: 'cancelado',
                  google_last_synced: new Date().toISOString()
                })
                .eq('id', session.id)
              cancelledCount++
            }
          }
        } catch (error) {
          console.error(`Erro ao verificar evento ${session.google_event_id}:`, error)
        }
      }

      if (cancelledCount > 0) {
        toast({
          title: "Eventos cancelados detectados",
          description: `${cancelledCount} evento(s) foram cancelados no Google Calendar.`,
          variant: "destructive"
        })
        await loadPlatformSessions()
      }

      return cancelledCount
    } catch (error) {
      console.error('Erro ao verificar eventos cancelados:', error)
      return 0
    }
  }

  // Sincronizar todas as sessões espelhadas com o Google
  const syncMirroredSessions = async (): Promise<{ updated: number; conflicts: number }> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !user) return { updated: 0, conflicts: 0 }

    const mirroredSessions = platformSessions.filter(s => s.google_sync_type === 'espelhado')
    let updatedCount = 0
    let conflictCount = 0

    setLoading(true)
    try {
      for (const session of mirroredSessions) {
        if (!session.google_event_id) continue

        try {
          // Buscar evento atual no Google
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${session.google_event_id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            }
          )

          if (!response.ok) {
            if (response.status === 404) {
              // Evento foi excluído no Google
              await supabase
                .from('sessions')
                .update({ google_sync_type: 'cancelado' })
                .eq('id', session.id)
            }
            continue
          }

          const googleEvent = await response.json()
          
          // Comparar datas/horários
          const googleStart = new Date(googleEvent.start.dateTime || googleEvent.start.date)
          const sessionStart = new Date(`${session.data}T${session.horario}`)
          
          const googleDate = googleStart.toISOString().split('T')[0]
          const googleTime = format(googleStart, "HH:mm")
          
          const platformDate = session.data
          const platformTime = session.horario.substring(0, 5)

          // Se Google foi atualizado mais recentemente, atualizar plataforma
          const googleUpdated = new Date(googleEvent.updated)
          const platformSynced = session.google_last_synced ? new Date(session.google_last_synced) : new Date(0)

          if (googleDate !== platformDate || googleTime !== platformTime) {
            if (googleUpdated > platformSynced) {
              // Atualizar plataforma com dados do Google
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
              updatedCount++
            } else {
              // Há conflito - plataforma foi modificada
              conflictCount++
            }
          } else {
            // Atualizar timestamp de sync
            await supabase
              .from('sessions')
              .update({ google_last_synced: new Date().toISOString() })
              .eq('id', session.id)
          }
        } catch (error) {
          console.error(`Erro ao sincronizar sessão ${session.id}:`, error)
        }
      }

      if (updatedCount > 0 || conflictCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${updatedCount} sessão(ões) atualizada(s)${conflictCount > 0 ? `, ${conflictCount} conflito(s) detectado(s)` : ''}.`,
        })
        await loadPlatformSessions()
      }

      return { updated: updatedCount, conflicts: conflictCount }
    } catch (error) {
      console.error('Erro ao sincronizar sessões espelhadas:', error)
      toast({
        title: "Erro",
        description: "Não foi possível sincronizar as sessões.",
        variant: "destructive"
      })
      return { updated: 0, conflicts: 0 }
    } finally {
      setLoading(false)
    }
  }

  // Enviar alterações da plataforma para o Google (sessões espelhadas)
  const pushMirroredChangesToGoogle = async (): Promise<number> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !user) return 0

    const mirroredSessions = platformSessions.filter(s => 
      s.google_sync_type === 'espelhado' && s.google_event_id
    )
    let updatedCount = 0

    setLoading(true)
    try {
      for (const session of mirroredSessions) {
        const success = await updateGoogleEvent(session)
        if (success) updatedCount++
      }

      if (updatedCount > 0) {
        toast({
          title: "Alterações enviadas!",
          description: `${updatedCount} evento(s) atualizado(s) no Google Calendar.`,
        })
      }

      return updatedCount
    } catch (error) {
      console.error('Erro ao enviar alterações para o Google:', error)
      return 0
    } finally {
      setLoading(false)
    }
  }

  // Enviar sessão para o Google
  const sendToGoogle = async (session: PlatformSession): Promise<boolean> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !user) return false

    // Prevenir duplicação: verificar se já tem google_event_id
    if (session.google_event_id) {
      toast({
        title: "Já sincronizado",
        description: "Esta sessão já está no Google Calendar.",
      })
      return false
    }

    setSyncing(session.id)
    try {
      const startDateTime = new Date(`${session.data}T${session.horario}`)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // +1 hora

      const googleEvent = {
        summary: `Sessão - ${session.clients?.nome || 'Cliente'}`,
        description: session.anotacoes || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        attendees: session.clients?.email ? [{ email: session.clients.email }] : undefined,
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent)
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const createdEvent = await response.json()

      // Atualizar sessão com referência ao evento do Google
      const { error } = await supabase
        .from('sessions')
        .update({
          google_event_id: createdEvent.id,
          google_sync_type: 'enviado' as GoogleSyncType,
          google_html_link: createdEvent.htmlLink,
          google_last_synced: new Date().toISOString()
        })
        .eq('id', session.id)

      if (error) throw error

      toast({
        title: "Enviado para o Google!",
        description: "A sessão foi publicada no Google Calendar.",
      })

      await loadAllData()
      return true
    } catch (error) {
      console.error('Erro ao enviar para o Google:', error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a sessão para o Google Calendar.",
        variant: "destructive"
      })
      return false
    } finally {
      setSyncing(null)
    }
  }

  // Espelhar sessão da plataforma com o Google (enviar + sincronização bidirecional)
  const mirrorPlatformSession = async (session: PlatformSession): Promise<boolean> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !user) return false

    // Se já está espelhado, não precisa fazer nada
    if (session.google_sync_type === 'espelhado') {
      toast({
        title: "Já espelhado",
        description: "Esta sessão já está com espelhamento ativo.",
      })
      return false
    }

    setSyncing(session.id)
    try {
      let googleEventId = session.google_event_id
      let googleHtmlLink = session.google_html_link

      // Se ainda não está no Google, enviar primeiro
      if (!googleEventId) {
        const startDateTime = new Date(`${session.data}T${session.horario}`)
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

        const googleEvent = {
          summary: `Sessão - ${session.clients?.nome || 'Cliente'}`,
          description: session.anotacoes || '',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          attendees: session.clients?.email ? [{ email: session.clients.email }] : undefined,
        }

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(googleEvent)
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const createdEvent = await response.json()
        googleEventId = createdEvent.id
        googleHtmlLink = createdEvent.htmlLink
      }

      // Atualizar sessão para espelhado
      const { error } = await supabase
        .from('sessions')
        .update({
          google_event_id: googleEventId,
          google_sync_type: 'espelhado' as GoogleSyncType,
          google_html_link: googleHtmlLink,
          google_last_synced: new Date().toISOString()
        })
        .eq('id', session.id)

      if (error) throw error

      toast({
        title: "Espelhamento ativado!",
        description: "A sessão agora será sincronizada bidirecionalmente com o Google.",
      })

      await loadAllData()
      return true
    } catch (error) {
      console.error('Erro ao espelhar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível ativar o espelhamento.",
        variant: "destructive"
      })
      return false
    } finally {
      setSyncing(null)
    }
  }

  // Atualizar evento no Google (para sessões espelhadas)
  const updateGoogleEvent = async (session: PlatformSession): Promise<boolean> => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken || !session.google_event_id) return false

    try {
      const startDateTime = new Date(`${session.data}T${session.horario}`)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

      const googleEvent = {
        summary: `Sessão - ${session.clients?.nome || 'Cliente'}`,
        description: session.anotacoes || '',
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
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${session.google_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent)
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Atualizar timestamp de sincronização
      await supabase
        .from('sessions')
        .update({ google_last_synced: new Date().toISOString() })
        .eq('id', session.id)

      return true
    } catch (error) {
      console.error('Erro ao atualizar evento no Google:', error)
      return false
    }
  }

  // Agrupar eventos recorrentes em séries
  const groupRecurringEvents = useMemo((): Map<string, RecurringEventSeries> => {
    const seriesMap = new Map<string, RecurringEventSeries>()
    
    for (const event of googleEvents) {
      const masterId = getRecurringMasterId(event)
      
      if (masterId) {
        const existing = seriesMap.get(masterId)
        
        if (existing) {
          existing.instances.push(event)
          existing.totalCount++
          
          // Atualizar primeira/última instância
          const eventStart = new Date(event.start.dateTime || event.start.date || '')
          const firstStart = new Date(existing.firstInstance.start.dateTime || existing.firstInstance.start.date || '')
          const lastStart = new Date(existing.lastInstance.start.dateTime || existing.lastInstance.start.date || '')
          
          if (eventStart < firstStart) {
            existing.firstInstance = event
          }
          if (eventStart > lastStart) {
            existing.lastInstance = event
          }
        } else {
          seriesMap.set(masterId, {
            masterId,
            summary: event.summary,
            instances: [event],
            firstInstance: event,
            lastInstance: event,
            totalCount: 1,
            recurrenceRule: event.recurrence?.[0]
          })
        }
      }
    }
    
    // Ordenar instâncias por data
    seriesMap.forEach(series => {
      series.instances.sort((a, b) => {
        const dateA = new Date(a.start.dateTime || a.start.date || '')
        const dateB = new Date(b.start.dateTime || b.start.date || '')
        return dateA.getTime() - dateB.getTime()
      })
    })
    
    return seriesMap
  }, [googleEvents])

  // Obter todas as instâncias de uma série recorrente
  const getRecurringSeriesInstances = (event: GoogleEvent): GoogleEvent[] => {
    const masterId = getRecurringMasterId(event)
    if (!masterId) return [event]
    
    const series = groupRecurringEvents.get(masterId)
    return series?.instances || [event]
  }

  // Importar série recorrente inteira
  const importRecurringSeries = async (event: GoogleEvent, createClient = false): Promise<number> => {
    const seriesInstances = getRecurringSeriesInstances(event)
    
    if (seriesInstances.length <= 1) {
      // Se só tem uma instância, importar normalmente
      const success = await importGoogleEvent(event, createClient)
      return success ? 1 : 0
    }
    
    setSyncing(event.id)
    let successCount = 0
    let clientId: string | null = null
    
    try {
      // Criar cliente uma vez se solicitado
      if (createClient && seriesInstances[0].attendees && seriesInstances[0].attendees.length > 0) {
        const attendee = seriesInstances[0].attendees[0]
        const clientName = attendee.displayName || event.summary.split(' - ')[1] || event.summary
        const clientEmail = attendee.email

        // Verificar se cliente já existe
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user!.id)
          .eq('email', clientEmail)
          .maybeSingle()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert([{
              user_id: user!.id,
              nome: clientName,
              email: clientEmail,
              telefone: '',
              dados_clinicos: `Importado do Google Calendar (série recorrente)`
            }])
            .select()
            .single()

          if (!clientError && newClient) {
            clientId = newClient.id
          }
        }
      }
      
      // Se não temos cliente, criar um
      if (!clientId) {
        const clientName = event.summary.split(' - ')[1] || event.summary
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            user_id: user!.id,
            nome: clientName,
            email: '',
            telefone: '',
            dados_clinicos: `Importado do Google Calendar (série recorrente)`
          }])
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      const masterId = getRecurringMasterId(event)
      
      // Importar todas as instâncias
      for (const instance of seriesInstances) {
        const startDateTime = instance.start.dateTime || instance.start.date
        const eventDate = new Date(startDateTime!).toISOString().split('T')[0]
        const eventTime = instance.start.dateTime 
          ? format(new Date(startDateTime!), "HH:mm")
          : "09:00"

        const { error: sessionError } = await supabase
          .from('sessions')
          .insert([{
            user_id: user!.id,
            client_id: clientId,
            data: eventDate,
            horario: formatTimeForDatabase(eventTime),
            status: 'agendada',
            anotacoes: instance.description || '',
            google_event_id: instance.id,
            google_sync_type: 'importado' as GoogleSyncType,
            google_attendees: instance.attendees || [],
            google_location: instance.location || null,
            google_html_link: instance.htmlLink,
            google_recurrence_id: masterId,
            google_last_synced: new Date().toISOString()
          }])

        if (!sessionError) {
          successCount++
        }
      }

      toast({
        title: "Série importada!",
        description: `${successCount} de ${seriesInstances.length} instâncias de "${event.summary}" foram importadas.`,
      })

      await loadPlatformSessions()
    } catch (error) {
      console.error('Erro ao importar série:', error)
      toast({
        title: "Erro",
        description: "Não foi possível importar a série completa.",
        variant: "destructive"
      })
    } finally {
      setSyncing(null)
    }
    
    return successCount
  }

  // Ações em lote
  const batchImportGoogleEvents = async (eventIds: string[], createClients = false): Promise<number> => {
    let successCount = 0
    for (const eventId of eventIds) {
      const event = googleEvents.find(e => e.id === eventId)
      if (event) {
        const success = await importGoogleEvent(event, createClients)
        if (success) successCount++
      }
    }
    return successCount
  }

  const batchSendToGoogle = async (sessionIds: string[]): Promise<number> => {
    let successCount = 0
    for (const sessionId of sessionIds) {
      const session = platformSessions.find(s => s.id === sessionId)
      if (session && !session.google_event_id) {
        const success = await sendToGoogle(session)
        if (success) successCount++
      }
    }
    return successCount
  }

  const batchIgnoreGoogleEvents = async (eventIds: string[]): Promise<number> => {
    let successCount = 0
    for (const eventId of eventIds) {
      const success = await ignoreGoogleEvent(eventId)
      if (success) successCount++
    }
    setSelectedGoogleEvents(new Set())
    return successCount
  }

  // Toggle seleção
  const toggleGoogleEventSelection = (eventId: string) => {
    setSelectedGoogleEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const togglePlatformSessionSelection = (sessionId: string) => {
    setSelectedPlatformSessions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  const selectAllGoogleEvents = () => {
    const ignoredEvents = JSON.parse(localStorage.getItem('google_ignored_events') || '[]')
    const importedEventIds = platformSessions.map(s => s.google_event_id).filter(Boolean)
    const availableEvents = googleEvents.filter(e => 
      !ignoredEvents.includes(e.id) && !importedEventIds.includes(e.id)
    )
    setSelectedGoogleEvents(new Set(availableEvents.map(e => e.id)))
  }

  const selectAllPlatformSessions = () => {
    const localSessions = platformSessions.filter(s => !s.google_sync_type || s.google_sync_type === 'local')
    setSelectedPlatformSessions(new Set(localSessions.map(s => s.id)))
  }

  const clearSelections = () => {
    setSelectedGoogleEvents(new Set())
    setSelectedPlatformSessions(new Set())
  }

  // Verificar se já está conectado ao carregar
  useEffect(() => {
    const accessToken = localStorage.getItem('google_access_token')
    if (accessToken && isInitialized) {
      setIsSignedIn(true)
      loadAllData()
    }
  }, [isInitialized, user])

  // Filtrar eventos ignorados e já importados
  const getFilteredGoogleEvents = useCallback(() => {
    const ignoredEvents = JSON.parse(localStorage.getItem('google_ignored_events') || '[]')
    const importedEventIds = platformSessions.map(s => s.google_event_id).filter(Boolean)
    
    return googleEvents.filter(event => 
      !ignoredEvents.includes(event.id) && !importedEventIds.includes(event.id)
    )
  }, [googleEvents, platformSessions])

  return {
    // State
    isInitialized,
    isSignedIn,
    googleEvents,
    platformSessions,
    loading,
    syncing,
    selectedGoogleEvents,
    selectedPlatformSessions,
    
    // Computed
    filteredGoogleEvents: getFilteredGoogleEvents(),
    groupedRecurringEvents: groupRecurringEvents,
    
    // Actions - Connection
    connectToGoogle,
    disconnectFromGoogle,
    
    // Actions - Load
    loadAllData,
    loadGoogleEvents,
    loadPlatformSessions,
    
    // Actions - Single
    importGoogleEvent,
    mirrorGoogleEvent,
    mirrorPlatformSession,
    ignoreGoogleEvent,
    sendToGoogle,
    updateGoogleEvent,
    markAttendeesAsClients,
    
    // Actions - Sync
    syncMirroredSessions,
    pushMirroredChangesToGoogle,
    checkCancelledEvents,
    getAccessToken,
    
    // Actions - Recurring Series
    getRecurringSeriesInstances,
    importRecurringSeries,
    
    // Actions - Batch
    batchImportGoogleEvents,
    batchSendToGoogle,
    batchIgnoreGoogleEvents,
    
    // Selection
    toggleGoogleEventSelection,
    togglePlatformSessionSelection,
    selectAllGoogleEvents,
    selectAllPlatformSessions,
    clearSelections,
  }
}
