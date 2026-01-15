import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NewFeatureBadgeProps {
  /** The feature key to check in localStorage */
  featureKey: string
  className?: string
  /** Optional callback when badge is dismissed */
  onDismiss?: () => void
}

// Custom event name for global dismissal synchronization
const DISMISS_EVENT = 'feature-badge-dismissed'

/**
 * Dismiss a feature badge programmatically and globally.
 * This function updates localStorage AND dispatches a global event
 * so all NewFeatureBadge components with the same featureKey will hide immediately.
 */
export const dismissFeatureBadge = (featureKey: string) => {
  // Remove from recently_unlocked_features
  const storedFeatures = localStorage.getItem('recently_unlocked_features')
  if (storedFeatures) {
    try {
      const features = JSON.parse(storedFeatures) as string[]
      const updated = features.filter(f => f !== featureKey)
      if (updated.length > 0) {
        localStorage.setItem('recently_unlocked_features', JSON.stringify(updated))
      } else {
        localStorage.removeItem('recently_unlocked_features')
      }
    } catch {
      localStorage.removeItem('recently_unlocked_features')
    }
  }
  
  // Add to dismissed_feature_badges to ensure permanent dismissal
  const dismissedFeatures = localStorage.getItem('dismissed_feature_badges')
  const dismissed = dismissedFeatures ? JSON.parse(dismissedFeatures) as string[] : []
  const updatedDismissed = [...new Set([...dismissed, featureKey])]
  localStorage.setItem('dismissed_feature_badges', JSON.stringify(updatedDismissed))
  
  // Dispatch global event to notify all NewFeatureBadge components
  window.dispatchEvent(new CustomEvent(DISMISS_EVENT, { detail: featureKey }))
}

/**
 * Badge that shows "Novo" for recently unlocked features.
 * Uses localStorage so it persists across sessions.
 * Disappears permanently when user hovers over it or when dismissFeatureBadge is called.
 */
export const NewFeatureBadge = ({ featureKey, className, onDismiss }: NewFeatureBadgeProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // First check if already dismissed permanently
    const dismissedFeatures = localStorage.getItem('dismissed_feature_badges')
    if (dismissedFeatures) {
      try {
        const dismissed = JSON.parse(dismissedFeatures) as string[]
        if (dismissed.includes(featureKey)) {
          return // Don't show if already dismissed
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Check if this feature was recently unlocked
    const storedFeatures = localStorage.getItem('recently_unlocked_features')
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
  }, [featureKey])

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
    if (!isVisible) return
    dismissFeatureBadge(featureKey)
    onDismiss?.()
  }, [featureKey, isVisible, onDismiss])

  if (!isVisible) return null

  return (
    <Badge 
      onMouseEnter={handleDismiss}
      onClick={(e) => {
        e.stopPropagation()
        handleDismiss()
      }}
      className={cn(
        "bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 h-5 whitespace-nowrap min-w-[42px] justify-center animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] cursor-pointer",
        className
      )}
    >
      Novo
    </Badge>
  )
}

export default NewFeatureBadge
