import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NewFeatureBadgeProps {
  /** The feature key to check in localStorage */
  featureKey: string
  className?: string
}

/**
 * Badge that shows "Novo" for recently unlocked features.
 * Uses localStorage so it persists across sessions.
 * Disappears permanently when user hovers over it.
 */
export const NewFeatureBadge = ({ featureKey, className }: NewFeatureBadgeProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if this feature was recently unlocked (use localStorage for persistence)
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

  const dismissBadge = () => {
    if (!isVisible) return
    
    // Remove this feature from localStorage permanently
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
    
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <Badge 
      onMouseEnter={dismissBadge}
      onClick={dismissBadge}
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
