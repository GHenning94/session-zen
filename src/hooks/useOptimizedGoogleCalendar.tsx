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
// Request offline access for refresh token
const SCOPES = 'https://www.googleapis.com/auth/calendar'
// Increased buffer to refresh token earlier (15 minutes before expiry)
const TOKEN_EXPIRY_BUFFER = 15 * 60 * 1000
// Storage keys for persistent token management
const TOKEN_STORAGE_KEY = 'google_access_token'
const REFRESH_TOKEN_STORAGE_KEY = 'google_refresh_token'
const TOKEN_EXPIRY_STORAGE_KEY = 'google_token_expires_at'
const CONNECTION_STATUS_KEY = 'google_calendar_connected'

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
    const expiresAt = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
    if (!expiresAt) return true
    return Date.now() >= (parseInt(expiresAt) - TOKEN_EXPIRY_BUFFER)
  }, [])

  // Check if user was previously connected (for reconnection purposes)
  const wasConnected = useCallback(() => {
    return localStorage.getItem(CONNECTION_STATUS_KEY) === 'true'
  }, [])

  // Salvar token com tempo de expiração
  const saveToken = useCallback((accessToken: string, expiresIn: number, refreshToken?: string) => {
    const expiresAt = Date.now() + (expiresIn * 1000)
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiresAt.toString())
    localStorage.setItem(CONNECTION_STATUS_KEY, 'true')
    
    // Store refresh token if provided
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
    }
    
    // Agendar renovação automática - 15 min antes de expirar
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Renovar bem antes de expirar para garantir continuidade
    const refreshIn = Math.max((expiresIn * 1000) - TOKEN_EXPIRY_BUFFER, 30000) // Mínimo 30 segundos
    console.log(`[GoogleCalendar] Token salvo, próxima renovação em ${Math.round(refreshIn / 60000)} minutos`)
    
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTokenSilently()
    }, refreshIn)
  }, [])

  // Renovar token silenciosamente - NUNCA desconecta automaticamente
  const refreshTokenSilently = useCallback(async (): Promise<boolean> => {
    // Verificar se temos o token client inicializado
    if (!tokenClientRef.current) {
      console.log('[GoogleCalendar] Token client não inicializado, aguardando...')
      
      // Se estava conectado, tentar novamente em alguns segundos
      if (wasConnected()) {
        setTimeout(() => refreshTokenSilently(), 3000)
      }
      return false
    }

    try {
      console.log('[GoogleCalendar] Renovando token silenciosamente...')
      
      return new Promise<boolean>((resolve) => {
        const originalCallback = tokenClientRef.current.callback
        
        tokenClientRef.current.callback = (response: any) => {
          if (response.access_token) {
            saveToken(response.access_token, response.expires_in || 3600, response.refresh_token)
            setIsSignedIn(true)
            console.log('[GoogleCalendar] ✅ Token renovado com sucesso!')
            resolve(true)
          } else if (response.error) {
            console.warn('[GoogleCalendar] Renovação silenciosa falhou:', response.error)
            
            // CRÍTICO: Não desconectar - apenas agendar nova tentativa
            // Token pode estar temporariamente indisponível
            if (wasConnected()) {
              console.log('[GoogleCalendar] Mantendo status conectado, tentando novamente em 60s...')
              setTimeout(() => refreshTokenSilently(), 60000)
            }
            
            resolve(false)
          }
        }
        
        // Tentar renovar sem popup (silenciosamente) - prompt vazio
        tokenClientRef.current.requestAccessToken({ prompt: '' })
      })
    } catch (error) {
      console.error('[GoogleCalendar] Erro ao renovar token:', error)
      
      // CRÍTICO: Não desconectar em caso de erro - tentar novamente
      if (wasConnected()) {
        console.log('[GoogleCalendar] Erro na renovação, tentando novamente em 60s...')
        setTimeout(() => refreshTokenSilently(), 60000)
      }
      
      return false
    }
  }, [saveToken, wasConnected])

  // Obter token válido (renovando se necessário)
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    
    if (!accessToken) {
      // Se estava conectado mas não tem token, tentar renovar
      if (wasConnected()) {
        console.log('[GoogleCalendar] Token ausente mas estava conectado, tentando renovar...')
        const refreshed = await refreshTokenSilently()
        if (refreshed) {
          return localStorage.getItem(TOKEN_STORAGE_KEY)
        }
      }
      return null
    }
    
    if (isTokenExpired()) {
      console.log('[GoogleCalendar] Token expirado, tentando renovar...')
      const refreshed = await refreshTokenSilently()
      if (refreshed) {
        return localStorage.getItem(TOKEN_STORAGE_KEY)
      }
      // Mesmo que falhe, retornar o token antigo para tentar usar
      // A API vai rejeitar se estiver inválido e tentaremos de novo
      return accessToken
    }
    
    return accessToken
  }, [isTokenExpired, refreshTokenSilently, wasConnected])

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

  // Desconectar - único ponto de desconexão (manual pelo usuário)
  const disconnectFromGoogle = useCallback(() => {
    console.log('[GoogleCalendar] Desconectando manualmente...')
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(CONNECTION_STATUS_KEY)
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
  // CRÍTICO: Manter conexão persistente baseado no status salvo, não apenas no token
  useEffect(() => {
    const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    const expiresAt = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
    const wasUserConnected = wasConnected()
    
    // Se o usuário estava conectado, manter o status mesmo se o token expirou
    if (wasUserConnected && isInitialized) {
      setIsSignedIn(true)
      
      if (accessToken) {
        // Tem token - verificar se precisa renovar
        if (expiresAt) {
          const expiresAtMs = parseInt(expiresAt)
          const now = Date.now()
          
          if (expiresAtMs > now) {
            // Token ainda válido - agendar renovação
            const refreshIn = Math.max(expiresAtMs - now - TOKEN_EXPIRY_BUFFER, 30000)
            console.log(`[GoogleCalendar] Token válido, renovação em ${Math.round(refreshIn / 60000)} min`)
            
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
            refreshTimeoutRef.current = setTimeout(() => {
              refreshTokenSilently()
            }, refreshIn)
          } else {
            // Token expirado - renovar imediatamente
            console.log('[GoogleCalendar] Token expirado, renovando...')
            refreshTokenSilently()
          }
        } else {
          // Sem data de expiração - renovar por segurança
          refreshTokenSilently()
        }
        
        loadEvents()
      } else {
        // Sem token mas estava conectado - tentar renovar
        console.log('[GoogleCalendar] Sem token mas usuário estava conectado, tentando renovar...')
        refreshTokenSilently()
      }
    } else if (accessToken && isInitialized) {
      // Tem token mas status não estava salvo (migração) - considerar conectado
      setIsSignedIn(true)
      localStorage.setItem(CONNECTION_STATUS_KEY, 'true')
      loadEvents()
    }
  }, [isInitialized, loadEvents, refreshTokenSilently, wasConnected])

  // Auto-refresh de eventos (menos frequente)
  useEffect(() => {
    if (!isSignedIn) return

    const interval = setInterval(() => {
      loadEvents()
    }, 5 * 60 * 1000) // 5 minutos
    
    return () => clearInterval(interval)
  }, [isSignedIn, loadEvents])

  // Refresh token when tab becomes visible after being hidden
  // CRÍTICO: Sempre verifica e tenta renovar para manter conexão persistente
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Se estava conectado, verificar e renovar token se necessário
        if (wasConnected() || isSignedIn) {
          const expiresAt = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
          
          if (expiresAt) {
            const expiresAtMs = parseInt(expiresAt)
            const now = Date.now()
            
            // Se token expirado ou vai expirar em breve, renovar
            if (expiresAtMs - now < TOKEN_EXPIRY_BUFFER) {
              console.log('[GoogleCalendar] Tab visível - renovando token...')
              refreshTokenSilently()
            }
          } else {
            // Sem data de expiração - tentar renovar
            console.log('[GoogleCalendar] Tab visível - sem data de expiração, renovando...')
            refreshTokenSilently()
          }
          
          // Manter status conectado
          if (!isSignedIn && wasConnected()) {
            setIsSignedIn(true)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Também verificar ao carregar a página
    if (wasConnected() && !isSignedIn) {
      setIsSignedIn(true)
    }
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isSignedIn, refreshTokenSilently, wasConnected])

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