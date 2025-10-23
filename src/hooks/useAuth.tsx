import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// --- INÍCIO DA CORREÇÃO (TypeScript) ---
// Estendemos a interface User do Supabase para incluir a propriedade 'aal'
// que o Supabase usa para controle de 2FA (aal1 = pendente, aal2 = verificado)
declare module '@supabase/supabase-js' {
  interface User {
    aal?: 'aal1' | 'aal2';
  }
}
// --- FIM DA CORREÇÃO (TypeScript) ---

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

  // Helper unificado para processar a sessão e o AAL (Authentication Assurance Level)
  const processSession = (session: Session | null) => {
    console.log('useAuth: processando sessão...', { 
      sessionExists: !!session, 
      aal: session?.user?.aal // Agora o TypeScript reconhece o 'aal'
    });
    
    setSession(session);

    if (!session) {
      // Usuário deslogado
      setUser(null);
      setLoading(false);
      console.log('useAuth: estado finalizado: (loading: false, user: null)');
      return;
    }

    // Usuário logado, verificar AAL
    const currentAAL = session.user.aal; // E aqui também

    if (currentAAL === 'aal1') {
      // AAL1 significa que o usuário passou a senha, mas o 2FA está PENDENTE.
      // Tratamos isso como "ainda carregando" para bloquear o ProtectedRoute.
      setUser(session.user); // Deixamos o user (para o Login.tsx ler o email)
      setLoading(true);      // MAS mantemos loading: true (A CORREÇÃO)
      console.log('useAuth: estado pendente (AAL1): (loading: true, user: set)');
    } else {
      // AAL2 (2FA completo) ou AAL indefinido (2FA não ativado)
      // Em ambos os casos, o usuário está "totalmente" logado.
      setUser(session.user);
      setLoading(false);
      console.log('useAuth: estado finalizado: (loading: false, user: set)');
    }
  };

  useEffect(() => {
    console.log('useAuth: setting up auth listeners')
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`useAuth: auth state changed (event: ${event})`);
        
        // Usa o helper unificado
        processSession(session)
      }
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useAuth: initial session check');
      
      // Usa o helper unificado
      processSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata?: any, captchaToken?: string) => {
    const redirectUrl = `${window.location.origin}/auth/confirm`
    
    const { data, error } = await supabase.auth.signUp({
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
      
      if (error.message.includes('User already registered') || error.message.includes('already registered')) {
        translatedError.message = 'Conta já existente, por favor realize o login'
      } else if (error.message.includes('Password should be at least')) {
        translatedError.message = 'A senha deve ter pelo menos 6 caracteres.'
      } else if (error.message.includes('Unable to validate email address')) {
        translatedError.message = 'E-mail inválido. Verifique o formato do e-mail.'
      } else if (error.message.includes('Password is too weak')) {
        translatedError.message = 'A senha é muito fraca. Use pelo menos 6 caracteres com letras e números.'
      } else if (error.message.includes('Signup is disabled')) {
        translatedError.message = 'Cadastro temporariamente desabilitado. Tente novamente mais tarde.'
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
    
    // Traduzir erros para português (código inalterado)
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