import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

interface GoogleEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  status: string
  htmlLink: string
}

const GOOGLE_CLIENT_ID = "your-google-client-id" // Configurar no .env
const GOOGLE_API_KEY = "your-google-api-key" // Configurar no .env
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

export const useGoogleCalendar = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [events, setEvents] = useState<GoogleEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Inicializar Google API
  useEffect(() => {
    const initializeGapi = async () => {
      try {
        // @ts-ignore - Google API types
        await (window as any).gapi.load('auth2', () => {
          // @ts-ignore
          (window as any).gapi.auth2.init({
            client_id: GOOGLE_CLIENT_ID,
          })
        })

        // @ts-ignore - Google API types
        await (window as any).gapi.load('client', async () => {
          // @ts-ignore
          await (window as any).gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            clientId: GOOGLE_CLIENT_ID,
            discoveryDocs: [DISCOVERY_DOC],
            scope: SCOPES
          })

          setIsInitialized(true)
          
          // @ts-ignore
          const authInstance = (window as any).gapi.auth2.getAuthInstance()
          setIsSignedIn(authInstance.isSignedIn.get())
        })
      } catch (error) {
        console.error('Erro ao inicializar Google API:', error)
        toast({
          title: "Erro",
          description: "Não foi possível conectar com o Google.",
          variant: "destructive"
        })
      }
    }

    // Carregar Google API script se não estiver carregado
    if (!(window as any).gapi) {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = initializeGapi
      document.body.appendChild(script)
    } else {
      initializeGapi()
    }
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
      
      // @ts-ignore - Google API types
      const authInstance = (window as any).gapi.auth2.getAuthInstance()
      await authInstance.signIn()
      
      setIsSignedIn(true)
      
      toast({
        title: "Conectado!",
        description: "Google Calendar conectado com sucesso.",
      })

      // Carregar eventos após conectar
      await loadEvents()
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

  // Desconectar do Google
  const disconnectFromGoogle = async () => {
    try {
      // @ts-ignore - Google API types
      const authInstance = (window as any).gapi.auth2.getAuthInstance()
      await authInstance.signOut()
      
      setIsSignedIn(false)
      setEvents([])
      
      toast({
        title: "Desconectado",
        description: "Google Calendar desconectado com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    }
  }

  // Carregar eventos do Google Calendar
  const loadEvents = async () => {
    if (!isSignedIn) return

    setLoading(true)
    try {
      const now = new Date()
      const timeMin = now.toISOString()
      const timeMax = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 dias

      // @ts-ignore - Google API types
      const response = await (window as any).gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events = response.result.items || []
      setEvents(events)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos do Google Calendar.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Criar evento no Google Calendar
  const createGoogleEvent = async (eventData: {
    summary: string
    description?: string
    start: string
    end: string
    location?: string
    attendees?: string[]
  }) => {
    if (!isSignedIn) return false

    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.start,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: eventData.end,
          timeZone: 'America/Sao_Paulo',
        },
        location: eventData.location,
        attendees: eventData.attendees?.map(email => ({ email })),
      }

      // @ts-ignore - Google API types
      const response = await (window as any).gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      })

      if (response.status === 200) {
        toast({
          title: "Evento criado!",
          description: "Evento adicionado ao Google Calendar.",
        })
        await loadEvents() // Recarregar eventos
        return true
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível criar o evento no Google Calendar.",
        variant: "destructive"
      })
    }

    return false
  }

  return {
    isInitialized,
    isSignedIn,
    events,
    loading,
    connectToGoogle,
    disconnectFromGoogle,
    loadEvents,
    createGoogleEvent
  }
}