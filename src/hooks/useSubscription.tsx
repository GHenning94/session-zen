import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

export type SubscriptionPlan = 'basico' | 'pro' | 'premium'

export type Feature = 
  | 'whatsapp_notifications'
  | 'google_calendar'
  | 'reports'
  | 'advanced_reports'
  | 'referral_program'
  | 'referral_history'
  | 'goals'
  | 'public_page'
  | 'public_page_design'
  | 'public_page_advanced'
  | 'color_customization'
  | 'dashboard_advanced_cards'
  | 'unlimited_clients'
  | 'unlimited_sessions'

// Feature to minimum plan mapping
const FEATURE_TO_PLAN: Record<Feature, SubscriptionPlan> = {
  whatsapp_notifications: 'premium',
  google_calendar: 'premium',
  reports: 'pro',
  advanced_reports: 'premium',
  referral_program: 'pro',
  referral_history: 'premium',
  goals: 'pro',
  public_page: 'pro',
  public_page_design: 'premium',
  public_page_advanced: 'premium',
  color_customization: 'premium',
  dashboard_advanced_cards: 'pro',
  unlimited_clients: 'premium',
  unlimited_sessions: 'pro',
}

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  basico: 0,
  pro: 1,
  premium: 2
}

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
    maxClients: 10,
    maxSessionsPerClient: 10,
    hasHistory: false,
    hasPDFReports: false,
    hasWhatsAppIntegration: false,
    hasDesignCustomization: false,
    hasAdvancedSettings: false
  },
  pro: {
    maxClients: 50,
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
  billingInterval: string | null
  planLimits: PlanLimits
  canAddClient: (currentClientCount: number) => boolean
  canAddSession: (currentSessionCount: number) => boolean
  hasFeature: (feature: keyof PlanLimits) => boolean
  hasAccessToFeature: (feature: Feature) => boolean
  getRequiredPlanForFeature: (feature: Feature) => SubscriptionPlan
  showUpgradeModal: () => void
  checkSubscription: () => Promise<void>
  isLoading: boolean
  // Helper to mark features as recently unlocked (for "New" badge)
  markFeaturesAsUnlocked: (features: Feature[]) => void
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
  const [previousPlan, setPreviousPlan] = useState<SubscriptionPlan>('basico')
  const [billingInterval, setBillingInterval] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check subscription status (DB-first, Edge fallback)
  const checkSubscription = async () => {
    if (!user) {
      setCurrentPlan('basico')
      setBillingInterval(null)
      setIsLoading(false)
      setIsInitialized(true)
      return
    }

    setIsLoading(true)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan, billing_interval')
        .eq('user_id', user.id)
        .single()

      if (!profileError && profile?.subscription_plan) {
        const newPlan = profile.subscription_plan as SubscriptionPlan
        
        // Get the last known plan from localStorage to detect real upgrades
        const lastKnownPlanKey = `last_known_plan_${user.id}`
        const lastKnownPlan = localStorage.getItem(lastKnownPlanKey) as SubscriptionPlan | null
        
        // ✅ Só detectar upgrade se:
        // 1. Temos um plano anterior conhecido E
        // 2. O novo plano é superior ao anterior conhecido
        // Isso evita marcar features como "novas" em login normal
        if (lastKnownPlan && newPlan !== lastKnownPlan && PLAN_HIERARCHY[newPlan] > PLAN_HIERARCHY[lastKnownPlan]) {
          const newlyUnlocked = getNewlyUnlockedFeatures(lastKnownPlan, newPlan)
          if (newlyUnlocked.length > 0) {
            markFeaturesAsUnlocked(newlyUnlocked)
          }
        }
        
        // Salvar o plano atual como último plano conhecido
        localStorage.setItem(lastKnownPlanKey, newPlan)
        
        // ✅ Só atualizar previousPlan se realmente houve mudança
        if (newPlan !== currentPlan) {
          setPreviousPlan(currentPlan)
        }
        setCurrentPlan(newPlan)
        setBillingInterval(profile.billing_interval)
        setIsInitialized(true)
        return
      }

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

  // Get features that were unlocked by upgrading from one plan to another
  const getNewlyUnlockedFeatures = (fromPlan: SubscriptionPlan, toPlan: SubscriptionPlan): Feature[] => {
    const fromLevel = PLAN_HIERARCHY[fromPlan]
    const toLevel = PLAN_HIERARCHY[toPlan]
    
    return (Object.entries(FEATURE_TO_PLAN) as [Feature, SubscriptionPlan][])
      .filter(([_, requiredPlan]) => {
        const requiredLevel = PLAN_HIERARCHY[requiredPlan]
        return requiredLevel > fromLevel && requiredLevel <= toLevel
      })
      .map(([feature]) => feature)
  }

  // Mark features as recently unlocked (stored in localStorage with user-specific key)
  const markFeaturesAsUnlocked = useCallback((features: Feature[]) => {
    if (!user?.id) return
    const key = `recently_unlocked_features_${user.id}`
    const existing = localStorage.getItem(key)
    const current = existing ? JSON.parse(existing) as string[] : []
    const updated = [...new Set([...current, ...features])]
    localStorage.setItem(key, JSON.stringify(updated))
  }, [user?.id])

  useEffect(() => {
    console.log('useSubscription: user ID changed, checking subscription.')
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
          console.log('🔔 Profile subscription updated:', payload.new.subscription_plan, payload.new.billing_interval)
          if (payload.new.subscription_plan) {
            const newPlan = payload.new.subscription_plan as SubscriptionPlan
            
            // Get last known plan to detect real upgrade
            const lastKnownPlanKey = `last_known_plan_${user.id}`
            const lastKnownPlan = localStorage.getItem(lastKnownPlanKey) as SubscriptionPlan | null
            
            // Detect upgrade - só marca se realmente mudou de tier
            if (lastKnownPlan && PLAN_HIERARCHY[newPlan] > PLAN_HIERARCHY[lastKnownPlan]) {
              const newlyUnlocked = getNewlyUnlockedFeatures(lastKnownPlan, newPlan)
              if (newlyUnlocked.length > 0) {
                markFeaturesAsUnlocked(newlyUnlocked)
              }
            }
            
            // Atualizar o último plano conhecido
            localStorage.setItem(lastKnownPlanKey, newPlan)
            
            setPreviousPlan(currentPlan)
            setCurrentPlan(newPlan)
          }
          setBillingInterval(payload.new.billing_interval || null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, currentPlan, markFeaturesAsUnlocked])

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

  // Check if user has access to a specific feature
  const hasAccessToFeature = useCallback((feature: Feature): boolean => {
    const requiredPlan = FEATURE_TO_PLAN[feature]
    const currentLevel = PLAN_HIERARCHY[currentPlan]
    const requiredLevel = PLAN_HIERARCHY[requiredPlan]
    return currentLevel >= requiredLevel
  }, [currentPlan])

  // Get the minimum plan required for a feature
  const getRequiredPlanForFeature = useCallback((feature: Feature): SubscriptionPlan => {
    return FEATURE_TO_PLAN[feature]
  }, [])

  const showUpgradeModal = () => {
    window.open('/upgrade', '_blank')
  }

  return (
    <SubscriptionContext.Provider value={{
      currentPlan,
      billingInterval,
      planLimits,
      canAddClient,
      canAddSession,
      hasFeature,
      hasAccessToFeature,
      getRequiredPlanForFeature,
      showUpgradeModal,
      checkSubscription,
      isLoading,
      markFeaturesAsUnlocked
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}