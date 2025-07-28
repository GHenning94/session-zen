import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

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

const GOOGLE_CLIENT_ID = "1093962604103-jcv6t51dj03gk3n8s8rub9d8t3fhubfo.apps.googleusercontent.com"
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/calendar'

export const useGoogleCalendar = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [events, setEvents] = useState<GoogleEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Inicializar Google API usando a edge function
  const initializeGoogleAPI = async () => {
    try {
      setLoading(true)
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => {
        setIsInitialized(true)
      }
      document.head.appendChild(script)
    } catch (error) {
      console.error('Erro ao inicializar Google API:', error)
      toast({
        title: "Erro",
        description: "Não foi possível conectar com o Google.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initializeGoogleAPI()
  }, [])

  // Conectar com Google usando OAuth2
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
      
      // Usar Google Identity Services para autenticação
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
            await loadEvents()
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

  // Desconectar do Google
  const disconnectFromGoogle = async () => {
    try {
      localStorage.removeItem('google_access_token')
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

  // Carregar eventos do Google Calendar via edge function
  const loadEvents = async () => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: {
          action: 'listEvents',
          accessToken: accessToken,
          calendarId: 'primary'
        }
      })

      if (error) throw error
      setEvents(data.items || [])
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

  // Criar evento no Google Calendar via edge function
  const createGoogleEvent = async (eventData: {
    summary: string
    description?: string
    start: string
    end: string
    location?: string
    attendees?: string[]
  }) => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return false

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

      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: {
          action: 'createEvent',
          accessToken: accessToken,
          calendarId: 'primary',
          eventData: event
        }
      })

      if (error) throw error

      toast({
        title: "Evento criado!",
        description: "Evento adicionado ao Google Calendar.",
      })
      await loadEvents()
      return true
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

  // Verificar se já está conectado ao carregar
  useEffect(() => {
    const accessToken = localStorage.getItem('google_access_token')
    if (accessToken) {
      setIsSignedIn(true)
      loadEvents()
    }
  }, [isInitialized])

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