import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

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
  checkSubscription: () => Promise<void>
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

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const { user } = useAuth()
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('basico')
  // Começa como 'true' para esperar a verificação inicial
  const [isLoading, setIsLoading] = useState(true)

  // Check subscription status (DB-first, Edge fallback)
  const checkSubscription = async () => {
    if (!user) {
      setCurrentPlan('basico')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // 1) Fast path: read from profiles.subscription_plan
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('user_id', user.id)
        .single()

      if (!profileError && profile?.subscription_plan) {
        setCurrentPlan(profile.subscription_plan as SubscriptionPlan)
        return
      }

      // 2) Fallback: call Stripe checker (may be slow)
      console.log('🔄 Fallback: invoking check-subscription edge function...')
      const { data, error } = await supabase.functions.invoke('check-subscription')
      if (error) throw error

      if (data?.subscription_tier) {
        setCurrentPlan(data.subscription_tier as SubscriptionPlan)
      } else {
        setCurrentPlan('basico')
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      setCurrentPlan('basico')
    } finally {
      setIsLoading(false)
    }
  }

  // Check subscription when user ID changes (not on every user object change)
  useEffect(() => {
    console.log('useSubscription: user ID changed, checking subscription.');
    checkSubscription()
  }, [user?.id])

  // Listen to realtime changes in profile subscription_plan
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('profile_subscription_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('🔔 Profile subscription updated:', payload.new.subscription_plan)
          if (payload.new.subscription_plan) {
            setCurrentPlan(payload.new.subscription_plan as SubscriptionPlan)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

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
    // Implementar modal de upgrade
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
      checkSubscription,
      isLoading
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}