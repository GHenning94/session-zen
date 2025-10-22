import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type SubscriptionPlan = 'basico' | 'pro' | 'premium'

// ... (Interface PlanLimits e const PLAN_LIMITS continuam EXATAMENTE IGUAIS) ...
interface PlanLimits {
  maxClients: number
  maxSessionsPerClient: number
  hasHistory: boolean
  hasPDFReports: boolean
  hasWhatsAppIntegration: boolean
  hasDesignCustomization: boolean
  hasAdvancedSettings: boolean
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  basico: {
    maxClients: 3,
    maxSessionsPerClient: 4,
    hasHistory: false,
    hasPDFReports: false,
    hasWhatsAppIntegration: false,
    hasDesignCustomization: false,
    hasAdvancedSettings: false
  },
  pro: {
    maxClients: 20,
    maxSessionsPerClient: Infinity,
    hasHistory: true,
    hasPDFReports: false,
    hasWhatsAppIntegration: false,
    hasDesignCustomization: true,
    hasAdvancedSettings: false
  },
  premium: {
    maxClients: Infinity,
    maxSessionsPerClient: Infinity,
    hasHistory: true,
    hasPDFReports: true,
    hasWhatsAppIntegration: true,
    hasDesignCustomization: true,
    hasAdvancedSettings: true
  }
}

interface SubscriptionContextType {
  currentPlan: SubscriptionPlan
  planLimits: PlanLimits
  canAddClient: (currentClientCount: number) => boolean
  canAddSession: (currentSessionCount: number) => boolean
  hasFeature: (feature: keyof PlanLimits) => boolean
  showUpgradeModal: () => void
  checkSubscription: () => Promise<void> // Agora isso é o 'refetch'
  isLoading: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

interface SubscriptionProviderProps {
  children: ReactNode
}

// --- INÍCIO DA GRANDE CORREÇÃO (React Query) ---

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Esta é a função que busca os dados
  const fetchSubscription = async () => {
    if (!user) {
      console.log('🔄 Subscription check: No user, defaulting to basic.');
      return { subscription_tier: 'basico' }; // Retorna o objeto padrão
    }

    console.log('🔄 Checking subscription status (Slow API call)...')
    const { data, error } = await supabase.functions.invoke('check-subscription')
    
    if (error) {
      console.error('Error checking subscription:', error)
      throw new Error(error.message); // Deixe o React Query lidar com o erro
    }

    console.log('✅ Subscription data:', data)
    return data;
  }

  // Usamos useQuery para gerenciar o estado
  const { data: subscriptionData, isLoading, refetch } = useQuery({
    // A 'queryKey' identifica unicamente esta busca
    queryKey: ['subscription', user?.id], 
    
    // A 'queryFn' é a função que busca
    queryFn: fetchSubscription,
    
    // 'enabled' garante que só rode se o user existir
    enabled: !!user,
    
    // 'staleTime' define o cache. 5 minutos.
    // O usuário não verá 'loading' por 5 minutos, mesmo se focar a aba.
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    
    // 'refetchOnWindowFocus: false' é o seu pedido!
    // Não vai recarregar ao mudar de aba.
    refetchOnWindowFocus: false,
    
    // 'retry: 1' Tenta 1 vez se falhar.
    retry: 1,

    // 'initialData' garante que o plano seja 'basico' antes de tudo
    initialData: { subscription_tier: 'basico' }
  });

  // A função para o resto do app chamar e forçar uma atualização
  const checkSubscription = async () => {
    await refetch();
  }

  const currentPlan = (subscriptionData?.subscription_tier as SubscriptionPlan) || 'basico'
  const planLimits = PLAN_LIMITS[currentPlan]

  const canAddClient = (currentClientCount: number) => {
    return currentClientCount < planLimits.maxClients
  }

  const canAddSession = (currentSessionCount: number) => {
    return currentSessionCount < planLimits.maxSessionsPerClient
  }

  const hasFeature = (feature: keyof PlanLimits) => {
    return planLimits[feature] === true
  }

  const showUpgradeModal = () => {
    window.open('/upgrade', '_blank')
  }

  return (
    <SubscriptionContext.Provider value={{
      currentPlan,
      planLimits,
      canAddClient,
      canAddSession,
      hasFeature,
      showUpgradeModal,
      checkSubscription, // A função de refetch
      isLoading // O isLoading do useQuery
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}
// --- FIM DA GRANDE CORREÇÃO (React Query) ---