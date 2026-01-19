import { useState, useEffect, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface NewFeatureBadgeProps {
  /** The feature key to check in localStorage */
  featureKey: string
  className?: string
  /** Optional callback when badge is dismissed */
  onDismiss?: () => void
  /** 
   * If true, the badge will NOT dismiss on mouse enter of the badge itself.
   * Use this when you want to dismiss via an external container's onMouseEnter.
   * Default: false (badge dismisses when hovered directly)
   */
  externalDismissOnly?: boolean
}

// Custom event name for global dismissal synchronization
const DISMISS_EVENT = 'feature-badge-dismissed'

// Helper to get user-specific localStorage key
const getUserKey = (baseKey: string, userId?: string): string => {
  if (!userId) return baseKey
  return `${baseKey}_${userId}`
}

// Get current user ID from Supabase session in localStorage
const getCurrentUserId = (): string | undefined => {
  try {
    // Try to get from Supabase's local storage key
    const keys = Object.keys(localStorage)
    const supabaseKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (supabaseKey) {
      const data = JSON.parse(localStorage.getItem(supabaseKey) || '{}')
      return data?.user?.id
    }
  } catch {
    // Ignore errors
  }
  return undefined
}

/**
 * Dismiss a feature badge programmatically and globally.
 * This function updates localStorage AND dispatches a global event
 * so all NewFeatureBadge components with the same featureKey will hide immediately.
 */
export const dismissFeatureBadge = (featureKey: string, userId?: string) => {
  const effectiveUserId = userId || getCurrentUserId()
  const unlockedKey = getUserKey('recently_unlocked_features', effectiveUserId)
  const dismissedKey = getUserKey('dismissed_feature_badges', effectiveUserId)
  
  // Remove from recently_unlocked_features
  const storedFeatures = localStorage.getItem(unlockedKey)
  if (storedFeatures) {
    try {
      const features = JSON.parse(storedFeatures) as string[]
      const updated = features.filter(f => f !== featureKey)
      if (updated.length > 0) {
        localStorage.setItem(unlockedKey, JSON.stringify(updated))
      } else {
        localStorage.removeItem(unlockedKey)
      }
    } catch {
      localStorage.removeItem(unlockedKey)
    }
  }
  
  // Add to dismissed_feature_badges to ensure permanent dismissal
  const dismissedFeatures = localStorage.getItem(dismissedKey)
  const dismissed = dismissedFeatures ? JSON.parse(dismissedFeatures) as string[] : []
  const updatedDismissed = [...new Set([...dismissed, featureKey])]
  localStorage.setItem(dismissedKey, JSON.stringify(updatedDismissed))
  
  // Dispatch global event to notify all NewFeatureBadge components
  window.dispatchEvent(new CustomEvent(DISMISS_EVENT, { detail: featureKey }))
}

/**
 * Badge that shows "Novo" for recently unlocked features.
 * Uses localStorage with user-specific keys so it persists per user.
 * 
 * By default, disappears when user hovers over the badge itself.
 * Set externalDismissOnly=true to only dismiss via external container hover.
 */
export const NewFeatureBadge = ({ 
  featureKey, 
  className, 
  onDismiss,
  externalDismissOnly = false 
}: NewFeatureBadgeProps) => {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (!user?.id) return
    
    // ✅ IMPORTANTE: Só verificar UMA VEZ para evitar perda de estado ao mudar de aba
    // Isso previne que badges desapareçam quando o usuário muda de aba e volta
    if (hasCheckedRef.current && isVisible) return
    
    const unlockedKey = getUserKey('recently_unlocked_features', user.id)
    const dismissedKey = getUserKey('dismissed_feature_badges', user.id)
    
    // First check if already dismissed permanently
    const dismissedFeatures = localStorage.getItem(dismissedKey)
    if (dismissedFeatures) {
      try {
        const dismissed = JSON.parse(dismissedFeatures) as string[]
        if (dismissed.includes(featureKey)) {
          hasCheckedRef.current = true
          return // Don't show if already dismissed
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Check if this feature was recently unlocked
    const storedFeatures = localStorage.getItem(unlockedKey)
    if (storedFeatures) {
      try {
        const features = JSON.parse(storedFeatures) as string[]
        if (features.includes(featureKey)) {
          setIsVisible(true)
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    hasCheckedRef.current = true
  }, [featureKey, user?.id, isVisible])

  // Listen for global dismiss events
  useEffect(() => {
    const handleDismissEvent = (e: CustomEvent) => {
      if (e.detail === featureKey && isVisible) {
        setIsVisible(false)
        onDismiss?.()
      }
    }
    
    window.addEventListener(DISMISS_EVENT, handleDismissEvent as EventListener)
    return () => window.removeEventListener(DISMISS_EVENT, handleDismissEvent as EventListener)
  }, [featureKey, isVisible, onDismiss])

  const handleDismiss = useCallback(() => {
    if (!isVisible || !user?.id) return
    dismissFeatureBadge(featureKey, user.id)
    onDismiss?.()
  }, [featureKey, isVisible, onDismiss, user?.id])

  if (!isVisible) return null

  return (
    <Badge 
      onMouseEnter={externalDismissOnly ? undefined : handleDismiss}
      onClick={externalDismissOnly ? undefined : (e) => {
        e.stopPropagation()
        handleDismiss()
      }}
      className={cn(
        "bg-primary text-primary-foreground text-[9px] px-1 py-0.5 h-5 whitespace-nowrap w-[52px] justify-center animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]",
        externalDismissOnly ? "cursor-default" : "cursor-pointer",
        className
      )}
    >
      Novo
    </Badge>
  )
}

export default NewFeatureBadge
