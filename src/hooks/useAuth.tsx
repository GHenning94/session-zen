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

  // processSession (Lógica do AAL - Inalterada e Correta)
  const processSession = (session: Session | null) => {
    console.log('useAuth: processando sessão...', { 
      sessionExists: !!session, 
      aal: session?.user?.aal
    });
    
    setSession(session);

    if (!session) {
      setUser(null);
      setLoading(false);
      console.log('useAuth: estado finalizado: (loading: false, user: null)');
      return;
    }

    const currentAAL = session.user.aal;

    if (currentAAL === 'aal1') {
      setUser(session.user);
      setLoading(true); // <-- A CORREÇÃO CRÍTICA para o bug dos dados
      console.log('useAuth: estado pendente (AAL1): (loading: true, user: set)');
    } else {
      setUser(session.user);
      setLoading(false);
      console.log('useAuth: estado finalizado: (loading: false, user: set)');
    }
  };

  // useEffect de setup (Inalterado e Correto)
  useEffect(() => {
    console.log('useAuth: setting up auth listeners')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`useAuth: auth state changed (event: ${event})`);
        processSession(session)
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

  // signOut (Inalterada)
  const signOut = async () => {
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