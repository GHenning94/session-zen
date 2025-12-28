// src/hooks/useAuth.tsx
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

declare module '@supabase/supabase-js' {
  interface User {
    aal?: 'aal1' | 'aal2';
  }
}

// Helper function to set Realtime auth token
// This is CRITICAL for RLS-filtered postgres_changes to work
const setRealtimeAuthToken = (accessToken: string | undefined) => {
  if (accessToken) {
    console.log('[useAuth] Setting Realtime auth token');
    supabase.realtime.setAuth(accessToken);
  }
};

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
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

  const processSession = (session: Session | null, event?: string) => {
    console.log('[useAuth] Processando sessão...', { 
      sessionExists: !!session, 
      aal: session?.user?.aal,
      event,
      timestamp: new Date().toISOString()
    });
    
    setSession(session);

    if (!session) {
      setUser(null);
      setLoading(false);
      console.log('[useAuth] Estado finalizado: sem sessão (loading: false, user: null)');
      return;
    }

    const currentAAL = session.user.aal;
    
    // Se for TOKEN_REFRESHED ou USER_UPDATED, apenas atualiza sem ativar loading
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      setUser(session.user);
      setLoading(false);
      console.log('[useAuth] Token atualizado, mantendo loading: false');
      return;
    }

    if (currentAAL === 'aal1') {
      setUser(session.user);
      setLoading(true);
      console.log('[useAuth] AAL1 detectado (autenticação parcial): loading: true');
    } else {
      setUser(session.user);
      setLoading(false);
      console.log('[useAuth] Sessão completa estabelecida: loading: false');
    }
  };

  useEffect(() => {
    console.log('[useAuth] Configurando listeners de autenticação...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[useAuth] 🔔 Evento de autenticação: ${event}`, {
          timestamp: new Date().toISOString(),
          hasSession: !!session
        });

        // CRITICAL: Set Realtime auth token when session is available
        // This ensures postgres_changes with RLS filters work correctly
        if (session?.access_token) {
          setRealtimeAuthToken(session.access_token);
        }

        // ✅ CORREÇÃO CRÍTICA: Ignorar SIGNED_OUT durante confirmação de e-mail
        const isConfirming = sessionStorage.getItem('IS_CONFIRMING_AUTH');
        if (event === 'SIGNED_OUT' && isConfirming === 'true') {
          console.warn('[useAuth] ⚠️ SIGNED_OUT ignorado - confirmação de e-mail em andamento');
          return;
        }

        // ✅ CORREÇÃO: Ignorar SIGNED_OUT durante mudança de e-mail
        const isEmailChangePending = sessionStorage.getItem('IS_EMAIL_CHANGE_PENDING');
        if (event === 'SIGNED_OUT' && isEmailChangePending === 'true') {
          console.warn('[useAuth] ⚠️ SIGNED_OUT ignorado - mudança de e-mail em andamento');
          return;
        }
        
        // Logout completo
        if (event === 'SIGNED_OUT') {
          console.log('[useAuth] 🚪 Logout detectado - limpando estado completo');
          
          // ✅ PRESERVAR plano pendente antes de limpar
          const pendingPlan = localStorage.getItem('pending_plan');
          const pendingBilling = localStorage.getItem('pending_billing');
          
          // Limpar storage
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.error('[useAuth] Erro ao limpar storage:', e);
          }
          
          // ✅ RESTAURAR plano pendente após limpar
          if (pendingPlan) {
            console.log('[useAuth] 💾 Restaurando plano pendente após logout:', pendingPlan);
            localStorage.setItem('pending_plan', pendingPlan);
          }
          if (pendingBilling) {
            localStorage.setItem('pending_billing', pendingBilling);
          }
          
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }
        
        processSession(session, event)
      }
    )
    
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[useAuth] Verificação de sessão inicial');
      
      if (error) {
        console.error('[useAuth] ❌ Erro ao obter sessão inicial:', error.message);
        localStorage.clear();
        sessionStorage.clear();
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }
      
      // CRITICAL: Set Realtime auth token on initial session load
      if (session?.access_token) {
        setRealtimeAuthToken(session.access_token);
      }
      
      processSession(session)
    })
    
    return () => {
      console.log('[useAuth] Removendo listeners de autenticação');
      subscription.unsubscribe();
    }
  }, [])

  // Função para limpar cache residual mantendo notificações pendentes
  const cleanupResidualCache = () => {
    console.log('[useAuth] 🧹 Limpando cache residual do localStorage...');
    
    // Lista de chaves de cache sensível que devem ser removidas
    const sensitiveKeys = [
      'therapy-clients',
      'therapy-sessions', 
      'therapy-payments',
    ];
    
    // Preservar notificações pendentes antes da limpeza
    const pendingNotifications: string[] = [];
    
    // Procurar por qualquer cache de notificações pendentes
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('notification') || key.includes('pending_notification'))) {
        const value = localStorage.getItem(key);
        if (value) {
          pendingNotifications.push(JSON.stringify({ key, value }));
        }
      }
    }
    
    // Remover apenas dados sensíveis de cache
    sensitiveKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`[useAuth] 🗑️ Removendo cache sensível: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Remover caches de usuário antigo (de sessões anteriores)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('user-theme-cache_') ||
        key.startsWith('user-color-cache_') ||
        key.startsWith('canal_') ||
        key.startsWith('avatar-cache_')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log(`[useAuth] 🗑️ Removendo cache de usuário antigo: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Restaurar notificações pendentes
    pendingNotifications.forEach(item => {
      try {
        const { key, value } = JSON.parse(item);
        localStorage.setItem(key, value);
        console.log(`[useAuth] 🔔 Notificação pendente preservada: ${key}`);
      } catch (e) {
        // Ignorar erros de parse
      }
    });
    
    console.log('[useAuth] ✅ Limpeza de cache residual concluída');
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    console.log('[useAuth] Tentativa de login para:', email);
    
    // Limpar cache residual antes do login para garantir ambiente limpo
    cleanupResidualCache();
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken
      }
    })
    
    if (error) {
      console.error('[useAuth] ❌ Erro no login:', error.message);
      
      let translatedError = { ...error }
      
      // Tradução de mensagens de erro
      if (error.message.includes('Invalid login credentials')) {
        translatedError.message = 'Credenciais inválidas. Verifique seu e-mail e senha.'
      } else if (error.message.includes('Email not confirmed')) {
        translatedError.message = 'E-mail não confirmado. Verifique sua caixa de entrada.'
      } else if (error.message.includes('User not found')) {
        translatedError.message = 'Usuário não encontrado. Verifique seu e-mail.'
      } else if (error.message.includes('Too many requests')) {
        translatedError.message = 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
      }
      
      return { error: translatedError }
    }
    
    console.log('[useAuth] ✅ Login bem-sucedido');
    return { error }
  }

  const signOut = async () => {
    console.log('[useAuth] Iniciando logout...');
    
    // Limpar cache do usuário antes do logout
    if (user?.id) {
      console.log('[useAuth] Limpando cache do usuário:', user.id);
      
      // Limpar cache de tema
      const themeCacheKey = `user-theme-cache_${user.id}`
      localStorage.removeItem(themeCacheKey)
      
      // Limpar cache de cor
      const colorCacheKey = `user-color-cache_${user.id}`
      localStorage.removeItem(colorCacheKey)
      
      // Limpar caches de dados
      const cacheKeys = [
        'therapy-clients',
        'therapy-sessions',
        'therapy-payments'
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Limpar caches de canal por período
      ['1', '3', '6', '12'].forEach(period => {
        localStorage.removeItem(`canal_${user.id}_${period}`)
        localStorage.removeItem(`canal_${user.id}_${period}_time`)
      })
    }
    
    // Remover todos os canais realtime ativos
    const channels = supabase.getChannels()
    if (channels.length > 0) {
      console.log(`[useAuth] Removendo ${channels.length} canais realtime`);
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
    
    // Limpar estado imediatamente
    setUser(null)
    setSession(null)
    setLoading(false)
    
    console.log('[useAuth] Estado limpo, executando logout no Supabase...');
    const result = await supabase.auth.signOut()
    
    if (result.error) {
      console.error('[useAuth] ❌ Erro no logout:', result.error);
    } else {
      console.log('[useAuth] ✅ Logout concluído com sucesso');
    }
    
    return result
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}