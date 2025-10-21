import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any, captchaToken?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
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

  useEffect(() => {
    console.log('useAuth: setting up auth listeners')
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth: auth state changed', { event, sessionExists: !!session, userEmail: session?.user?.email })
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: initial session check', { sessionExists: !!session, userEmail: session?.user?.email })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata?: any, captchaToken?: string) => {
    const redirectUrl = `${window.location.origin}/auth/confirm`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
        captchaToken
      }
    })
    
    // Traduzir erros para português
    if (error) {
      let translatedError = { ...error }
      
      if (error.message.includes('User already registered')) {
        translatedError.message = 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.'
      } else if (error.message.includes('Password should be at least')) {
        translatedError.message = 'A senha deve ter pelo menos 6 caracteres.'
      } else if (error.message.includes('Unable to validate email address')) {
        translatedError.message = 'E-mail inválido. Verifique o formato do e-mail.'
      } else if (error.message.includes('Password is too weak')) {
        translatedError.message = 'A senha é muito fraca. Use pelo menos 6 caracteres com letras e números.'
      } else if (error.message.includes('Signup is disabled')) {
        translatedError.message = 'Cadastro temporariamente desabilitado. Tente novamente mais tarde.'
      } else if (error.message.includes('User already registered') || error.message.includes('already registered')) {
        translatedError.message = 'Este e-mail já está em uso. Tente fazer login ou use outro e-mail.'
      }
      
      return { error: translatedError }
    }
    
    return { error }
  }

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken
      }
    })
    
    // Traduzir erros para português
    if (error) {
      let translatedError = { ...error }
      
      if (error.message.includes('Invalid login credentials')) {
        translatedError.message = 'Credenciais inválidas. Verifique seu e-mail e senha ou crie uma nova conta.'
      } else if (error.message.includes('Email not confirmed')) {
        translatedError.message = 'E-mail não confirmado. Verifique sua caixa de entrada.'
      } else if (error.message.includes('Too many requests')) {
        translatedError.message = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
      } else if (error.message.includes('Password should be at least')) {
        translatedError.message = 'A senha deve ter pelo menos 6 caracteres.'
      } else if (error.message.includes('Unable to validate email address')) {
        translatedError.message = 'E-mail inválido. Verifique o formato do e-mail.'
      } else if (error.message.includes('Password is too weak')) {
        translatedError.message = 'A senha é muito fraca. Use pelo menos 6 caracteres.'
      }
      
      return { error: translatedError }
    }
    
    return { error }
  }

  const signOut = async () => {
    const result = await supabase.auth.signOut()
    return result
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}