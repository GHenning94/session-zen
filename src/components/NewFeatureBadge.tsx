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
 * Disappears when user hovers over it.
 */
export const NewFeatureBadge = ({ featureKey, className }: NewFeatureBadgeProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenSeen, setHasBeenSeen] = useState(false)

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

  const handleMouseEnter = () => {
    if (isVisible && !hasBeenSeen) {
      setHasBeenSeen(true)
      
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
      
      // Fade out after being seen
      setTimeout(() => {
        setIsVisible(false)
      }, 500)
    }
  }

  if (!isVisible) return null

  return (
    <Badge 
      onMouseEnter={handleMouseEnter}
      className={cn(
        "bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 animate-pulse transition-opacity duration-500",
        hasBeenSeen && "opacity-0",
        className
      )}
    >
      Novo
    </Badge>
  )
}

export default NewFeatureBadge
