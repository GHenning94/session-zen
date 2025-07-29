import { useState, useEffect, useCallback } from "react"
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

const GOOGLE_CLIENT_ID = "1039606606801-9ofdjvl0abgcr808q3i1jgmb6kojdk9d.apps.googleusercontent.com"
const SCOPES = 'https://www.googleapis.com/auth/calendar'

export const useOptimizedGoogleCalendar = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [events, setEvents] = useState<GoogleEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Memoizar carregamento de eventos
  const loadEvents = useCallback(async () => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return

    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const timeMin = today.toISOString()
      const timeMax = new Date(today.getFullYear(), 11, 31, 23, 59, 59).toISOString()
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setEvents(data.items || [])
      } else {
        throw new Error('Falha na autenticação')
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      if (error.message.includes('autenticação')) {
        localStorage.removeItem('google_access_token')
        setIsSignedIn(false)
        toast({
          title: "Sessão expirada",
          description: "Reconecte-se ao Google Calendar",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Inicialização otimizada
  useEffect(() => {
    const initGoogleAPI = async () => {
      if (typeof window === 'undefined') return
      
      try {
        if ((window as any).google?.accounts) {
          setIsInitialized(true)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        
        script.onload = () => setIsInitialized(true)
        script.onerror = () => {
          toast({
            title: "Erro",
            description: "Falha ao carregar Google API",
            variant: "destructive"
          })
        }
        
        document.head.appendChild(script)
      } catch (error) {
        console.error('Erro na inicialização:', error)
      }
    }

    initGoogleAPI()
  }, [toast])

  // Conectar com Google
  const connectToGoogle = useCallback(async () => {
    if (!isInitialized) {
      toast({
        title: "Aguarde",
        description: "Carregando Google API...",
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
              description: "Google Calendar conectado",
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
        description: "Falha na conexão",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [isInitialized, loadEvents, toast])

  // Desconectar
  const disconnectFromGoogle = useCallback(() => {
    localStorage.removeItem('google_access_token')
    setIsSignedIn(false)
    setEvents([])
    toast({
      title: "Desconectado",
      description: "Google Calendar desconectado",
    })
  }, [toast])

  // Criar evento otimizado
  const createGoogleEvent = useCallback(async (eventData: {
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

      if (response.ok) {
        toast({
          title: "Evento criado!",
          description: "Adicionado ao Google Calendar",
        })
        await loadEvents()
        return true
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast({
        title: "Erro",
        description: "Falha ao criar evento",
        variant: "destructive"
      })
    }

    return false
  }, [loadEvents, toast])

  // Verificar conexão existente
  useEffect(() => {
    const accessToken = localStorage.getItem('google_access_token')
    if (accessToken && isInitialized) {
      setIsSignedIn(true)
      loadEvents()
    }
  }, [isInitialized, loadEvents])

  // Auto-refresh otimizado
  useEffect(() => {
    if (!isSignedIn) return

    const interval = setInterval(() => {
      loadEvents()
    }, 60000) // 1 minuto
    
    return () => clearInterval(interval)
  }, [isSignedIn, loadEvents])

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