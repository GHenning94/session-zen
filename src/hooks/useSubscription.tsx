import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

export type SubscriptionPlan = 'basico' | 'pro' | 'premium'

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
  const [isLoading, setIsLoading] = useState(false)

  // Check subscription status
  const checkSubscription = async () => {
    if (!user) {
      setCurrentPlan('basico')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔄 Checking subscription status...')
      const { data, error } = await supabase.functions.invoke('check-subscription')
      
      if (error) {
        console.error('Error checking subscription:', error)
        setCurrentPlan('basico')
        return
      }

      console.log('✅ Subscription data:', data)
      if (data?.subscription_tier) {
        setCurrentPlan(data.subscription_tier as SubscriptionPlan)
      } else {
        setCurrentPlan('basico')
      }
    } catch (error) {
      console.error('Error calling check-subscription:', error)
      setCurrentPlan('basico')
    } finally {
      setIsLoading(false)
    }
  }

  // Check subscription when user changes
  useEffect(() => {
    checkSubscription()
  }, [user])

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