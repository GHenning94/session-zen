import { useState, useEffect, useCallback, useRef } from "react"
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
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000 // 5 minutos antes de expirar

export const useOptimizedGoogleCalendar = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [events, setEvents] = useState<GoogleEvent[]>([])
  const [loading, setLoading] = useState(false)
  const tokenClientRef = useRef<any>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar se o token está expirado ou prestes a expirar
  const isTokenExpired = useCallback(() => {
    const expiresAt = localStorage.getItem('google_token_expires_at')
    if (!expiresAt) return true
    return Date.now() >= (parseInt(expiresAt) - TOKEN_EXPIRY_BUFFER)
  }, [])

  // Salvar token com tempo de expiração
  const saveToken = useCallback((accessToken: string, expiresIn: number) => {
    const expiresAt = Date.now() + (expiresIn * 1000)
    localStorage.setItem('google_access_token', accessToken)
    localStorage.setItem('google_token_expires_at', expiresAt.toString())
    
    // Agendar renovação automática
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Renovar 5 minutos antes de expirar
    const refreshIn = (expiresIn * 1000) - TOKEN_EXPIRY_BUFFER
    if (refreshIn > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTokenSilently()
      }, refreshIn)
    }
  }, [])

  // Renovar token silenciosamente
  const refreshTokenSilently = useCallback(async () => {
    if (!tokenClientRef.current) {
      console.log('Token client não inicializado, aguardando...')
      return false
    }

    try {
      console.log('Renovando token do Google silenciosamente...')
      
      return new Promise<boolean>((resolve) => {
        tokenClientRef.current.callback = (response: any) => {
          if (response.access_token) {
            saveToken(response.access_token, response.expires_in || 3600)
            setIsSignedIn(true)
            console.log('Token renovado com sucesso!')
            resolve(true)
          } else if (response.error) {
            console.error('Erro ao renovar token:', response.error)
            // Se falhar silenciosamente, não desconectar - aguardar próxima tentativa
            resolve(false)
          }
        }
        
        // Tentar renovar sem mostrar popup (silenciosamente)
        tokenClientRef.current.requestAccessToken({ prompt: '' })
      })
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      return false
    }
  }, [saveToken])

  // Obter token válido (renovando se necessário)
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const accessToken = localStorage.getItem('google_access_token')
    
    if (!accessToken) return null
    
    if (isTokenExpired()) {
      console.log('Token expirado, tentando renovar...')
      const refreshed = await refreshTokenSilently()
      if (refreshed) {
        return localStorage.getItem('google_access_token')
      }
      return null
    }
    
    return accessToken
  }, [isTokenExpired, refreshTokenSilently])

  // Memoizar carregamento de eventos
  const loadEvents = useCallback(async () => {
    const accessToken = await getValidToken()
    if (!accessToken) {
      // Token inválido e não foi possível renovar
      if (localStorage.getItem('google_access_token')) {
        // Havia um token, então estava conectado - tentar reconectar
        console.log('Token inválido, solicitando reconexão...')
      }
      return
    }

    setLoading(true)
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
      } else if (response.status === 401) {
        // Token rejeitado, tentar renovar
        console.log('Token rejeitado pela API, tentando renovar...')
        const refreshed = await refreshTokenSilently()
        if (refreshed) {
          // Tentar novamente com novo token
          await loadEvents()
        } else {
          // Não foi possível renovar - manter conectado mas avisar
          toast({
            title: "Reconexão necessária",
            description: "Clique em 'Conectar' para renovar a conexão com o Google Calendar",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }, [getValidToken, refreshTokenSilently, toast])

  // Inicialização otimizada
  useEffect(() => {
    const initGoogleAPI = async () => {
      if (typeof window === 'undefined') return
      
      try {
        if ((window as any).google?.accounts) {
          // Inicializar token client
          tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: () => {}, // Será sobrescrito quando necessário
          })
          setIsInitialized(true)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        
        script.onload = () => {
          // Inicializar token client após carregar script
          tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: () => {}, // Será sobrescrito quando necessário
          })
          setIsInitialized(true)
        }
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

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [toast])

  // Conectar com Google
  const connectToGoogle = useCallback(async () => {
    if (!isInitialized || !tokenClientRef.current) {
      toast({
        title: "Aguarde",
        description: "Carregando Google API...",
      })
      return
    }

    try {
      setLoading(true)
      
      tokenClientRef.current.callback = async (response: any) => {
        if (response.access_token) {
          saveToken(response.access_token, response.expires_in || 3600)
          setIsSignedIn(true)
          toast({
            title: "Conectado!",
            description: "Google Calendar conectado",
          })
          await loadEvents()
        } else if (response.error) {
          console.error('Erro na autenticação:', response.error)
          toast({
            title: "Erro",
            description: "Falha na conexão com o Google",
            variant: "destructive"
          })
        }
        setLoading(false)
      }
      
      // Solicitar com consent para garantir permissões completas
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    } catch (error) {
      console.error('Erro ao conectar:', error)
      toast({
        title: "Erro",
        description: "Falha na conexão",
        variant: "destructive"
      })
      setLoading(false)
    }
  }, [isInitialized, loadEvents, saveToken, toast])

  // Desconectar
  const disconnectFromGoogle = useCallback(() => {
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_token_expires_at')
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
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
    const accessToken = await getValidToken()
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
      } else if (response.status === 401) {
        // Tentar renovar e repetir
        const refreshed = await refreshTokenSilently()
        if (refreshed) {
          return createGoogleEvent(eventData)
        }
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
  }, [getValidToken, loadEvents, refreshTokenSilently, toast])

  // Verificar conexão existente e configurar renovação
  useEffect(() => {
    const accessToken = localStorage.getItem('google_access_token')
    const expiresAt = localStorage.getItem('google_token_expires_at')
    
    if (accessToken && isInitialized) {
      setIsSignedIn(true)
      
      // Configurar renovação automática se tiver tempo de expiração
      if (expiresAt) {
        const expiresAtMs = parseInt(expiresAt)
        const now = Date.now()
        
        if (expiresAtMs > now) {
          // Token ainda válido - agendar renovação
          const refreshIn = expiresAtMs - now - TOKEN_EXPIRY_BUFFER
          if (refreshIn > 0) {
            refreshTimeoutRef.current = setTimeout(() => {
              refreshTokenSilently()
            }, refreshIn)
          } else {
            // Expiração iminente - renovar agora
            refreshTokenSilently()
          }
        } else {
          // Token expirado - tentar renovar silenciosamente
          refreshTokenSilently()
        }
      }
      
      loadEvents()
    }
  }, [isInitialized, loadEvents, refreshTokenSilently])

  // Auto-refresh de eventos (menos frequente)
  useEffect(() => {
    if (!isSignedIn) return

    const interval = setInterval(() => {
      loadEvents()
    }, 5 * 60 * 1000) // 5 minutos
    
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
    createGoogleEvent,
    refreshToken: refreshTokenSilently
  }
}