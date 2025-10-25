// src/hooks/useAuth.tsx
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// Declaração de tipos para 'aal' (Inalterado)
declare module '@supabase/supabase-js' {
  interface User {
    aal?: 'aal1' | 'aal2';
  }
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  // signUp: ... // <-- REMOVIDO
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  // signUp: async () => ({ error: null }), // <-- REMOVIDO
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // processSession - agora recebe o evento para evitar loading em TOKEN_REFRESHED
  const processSession = (session: Session | null, event?: string) => {
    console.log('useAuth: processando sessão...', { 
      sessionExists: !!session, 
      aal: session?.user?.aal,
      event
    });
    
    setSession(session);

    if (!session) {
      setUser(null);
      setLoading(false);
      console.log('useAuth: estado finalizado: (loading: false, user: null)');
      return;
    }

    const currentAAL = session.user.aal;
    
    // Se for TOKEN_REFRESHED ou USER_UPDATED, apenas atualiza user/session sem ativar loading
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      setUser(session.user);
      setLoading(false);
      console.log('useAuth: token refreshed/user updated (mantém loading: false)');
      return;
    }

    if (currentAAL === 'aal1') {
      setUser(session.user);
      setLoading(true);
      console.log('useAuth: estado pendente (AAL1): (loading: true, user: set)');
    } else {
      setUser(session.user);
      setLoading(false);
      console.log('useAuth: estado finalizado: (loading: false, user: set)');
    }
  };

  // useEffect de setup - passa o evento para processSession
  useEffect(() => {
    console.log('useAuth: setting up auth listeners')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`useAuth: auth state changed (event: ${event})`);
        processSession(session, event)
      }
    )
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: initial session check');
      processSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // const signUp = ... // <-- A FUNÇÃO INTEIRA FOI REMOVIDA

  // signIn (Inalterada, com traduções)
  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken
      }
    })
    
    if (error) {
      let translatedError = { ...error }
      if (error.message.includes('Invalid login credentials')) {
        translatedError.message = 'Credenciais inválidas. Verifique seu e-mail e senha.'
      } else if (error.message.includes('Email not confirmed')) {
        translatedError.message = 'E-mail não confirmado. Verifique sua caixa de entrada.' // <-- O erro que você queria
      }
      return { error: translatedError }
    }
    return { error }
  }

  // signOut - limpa cache e conexões antes de fazer logout
  const signOut = async () => {
    // Limpar todo o cache do usuário antes do logout
    if (user?.id) {
      // Limpar cache de tema
      const cacheKey = `user-theme-cache_${user.id}`
      localStorage.removeItem(cacheKey)
      
      // Limpar caches de dados
      localStorage.removeItem('therapy-clients')
      localStorage.removeItem('therapy-sessions')
      localStorage.removeItem('therapy-payments')
      
      // Limpar caches de canal por período
      ;['1', '3', '6', '12'].forEach(period => {
        localStorage.removeItem(`canal_${user.id}_${period}`)
        localStorage.removeItem(`canal_${user.id}_${period}_time`)
      })
    }
    
    // Remover todos os canais realtime ativos
    const channels = supabase.getChannels()
    channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    
    // Limpar estado imediatamente
    setUser(null)
    setSession(null)
    setLoading(false)
    
    const result = await supabase.auth.signOut()
    return result
  }

  const value = {
    user,
    session,
    loading,
    // signUp, // <-- REMOVIDO
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}