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

// Configurações corretas do Google OAuth - Client ID atualizado
const GOOGLE_CLIENT_ID = "1039606606801-9ofdjvl0abgcr808q3i1jgmb6kojdk9d.apps.googleusercontent.com"
const REDIRECT_URI = `${window.location.origin}`
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

  // Carregar eventos do Google Calendar
  const loadEvents = async () => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return

    setLoading(true)
    try {
      // Filtrar eventos do dia corrente até o final do ano
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const timeMin = today.toISOString()
      const timeMax = new Date(today.getFullYear(), 11, 31, 23, 59, 59).toISOString()
      
      // Usar diretamente a API do Google Calendar com filtros de data
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
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

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

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