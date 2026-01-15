import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NewFeatureBadgeProps {
  /** The feature key to check in sessionStorage */
  featureKey: string
  className?: string
}

/**
 * Badge that shows "Novo" for recently unlocked features.
 * Disappears when user hovers over the parent container.
 */
export const NewFeatureBadge = ({ featureKey, className }: NewFeatureBadgeProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if this feature was recently unlocked
    const storedFeatures = sessionStorage.getItem('recently_unlocked_features')
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
    
    // Remove this feature from the session storage
    const storedFeatures = sessionStorage.getItem('recently_unlocked_features')
    if (storedFeatures) {
      try {
        const features = JSON.parse(storedFeatures) as string[]
        const updated = features.filter(f => f !== featureKey)
        if (updated.length > 0) {
          sessionStorage.setItem('recently_unlocked_features', JSON.stringify(updated))
        } else {
          sessionStorage.removeItem('recently_unlocked_features')
        }
      } catch {
        // Invalid JSON, clear it
        sessionStorage.removeItem('recently_unlocked_features')
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
        "bg-primary text-primary-foreground text-[8px] px-1.5 py-0 whitespace-nowrap w-[52px] justify-center animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]",
        className
      )}
    >
      Novo
    </Badge>
  )
}

export default NewFeatureBadge
