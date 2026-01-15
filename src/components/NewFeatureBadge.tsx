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

/**
 * Badge that shows "Novo" for recently unlocked features.
 * Uses localStorage so it persists across sessions.
 * Disappears permanently when user hovers over it or any parent with onMouseEnter calling dismissBadge.
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

  const dismissBadge = useCallback(() => {
    if (!isVisible) return
    
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
        // Invalid JSON, clear it
        localStorage.removeItem('recently_unlocked_features')
      }
    }
    
    // Add to dismissed_feature_badges to ensure it never shows again
    const dismissedFeatures = localStorage.getItem('dismissed_feature_badges')
    const dismissed = dismissedFeatures ? JSON.parse(dismissedFeatures) as string[] : []
    const updatedDismissed = [...new Set([...dismissed, featureKey])]
    localStorage.setItem('dismissed_feature_badges', JSON.stringify(updatedDismissed))
    
    setIsVisible(false)
    onDismiss?.()
  }, [featureKey, isVisible, onDismiss])

  if (!isVisible) return null

  return (
    <Badge 
      onMouseEnter={dismissBadge}
      onClick={(e) => {
        e.stopPropagation()
        dismissBadge()
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

/**
 * Utility function to dismiss a feature badge programmatically.
 * Can be called from parent components when hovering over the container.
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
  
  // Add to dismissed_feature_badges
  const dismissedFeatures = localStorage.getItem('dismissed_feature_badges')
  const dismissed = dismissedFeatures ? JSON.parse(dismissedFeatures) as string[] : []
  const updatedDismissed = [...new Set([...dismissed, featureKey])]
  localStorage.setItem('dismissed_feature_badges', JSON.stringify(updatedDismissed))
}

export default NewFeatureBadge
