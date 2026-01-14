import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Feature } from '@/hooks/useSubscription'

interface NewFeatureBadgeProps {
  feature: Feature
  className?: string
}

export const NewFeatureBadge = ({ feature, className }: NewFeatureBadgeProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenSeen, setHasBeenSeen] = useState(false)

  useEffect(() => {
    // Check if this feature was recently unlocked
    const storedFeatures = sessionStorage.getItem('recently_unlocked_features')
    if (storedFeatures) {
      const features = JSON.parse(storedFeatures) as string[]
      if (features.includes(feature)) {
        setIsVisible(true)
      }
    }
  }, [feature])

  const handleMouseEnter = () => {
    if (isVisible && !hasBeenSeen) {
      setHasBeenSeen(true)
      
      // Remove this feature from the session storage
      const storedFeatures = sessionStorage.getItem('recently_unlocked_features')
      if (storedFeatures) {
        const features = JSON.parse(storedFeatures) as string[]
        const updated = features.filter(f => f !== feature)
        if (updated.length > 0) {
          sessionStorage.setItem('recently_unlocked_features', JSON.stringify(updated))
        } else {
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
