import { ReactNode, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'
import { Feature, FEATURE_INFO } from './FeatureGate'

interface LockedCardProps {
  feature: Feature
  title: string
  description?: string
  icon?: ReactNode
  children?: ReactNode
  className?: string
  /** Custom content to show when locked instead of blur */
  lockedContent?: ReactNode
  /** If true, shows placeholder content when locked */
  showPlaceholder?: boolean
}

export const LockedCard = ({
  feature,
  title,
  description,
  icon,
  children,
  className,
  lockedContent,
  showPlaceholder = true
}: LockedCardProps) => {
  const { hasAccessToFeature, getRequiredPlanForFeature } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const hasAccess = hasAccessToFeature(feature)
  const requiredPlan = getRequiredPlanForFeature(feature)
  const featureInfo = FEATURE_INFO[feature]
  const isPremium = requiredPlan === 'premium'
  
  if (hasAccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    )
  }
  
  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
          className
        )}
        onClick={() => setShowUpgradeModal(true)}
      >
        {/* Locked overlay */}
        <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isPremium 
              ? "bg-gradient-to-br from-amber-400 to-amber-600" 
              : "bg-gradient-primary"
          )}>
            {isPremium ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Lock className="w-6 h-6 text-white" />
            )}
          </div>
          <Badge 
            variant={isPremium ? 'warning' : 'default'}
            className="text-xs"
          >
            {isPremium ? 'Desbloqueie no plano Premium' : 'Desbloqueie no plano Profissional'}
          </Badge>
          <p className="text-xs text-muted-foreground text-center max-w-[200px]">
            Clique para saber mais
          </p>
        </div>
        
        {/* Background content (blurred) */}
        <CardHeader className="opacity-30">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        
        {showPlaceholder && (
          <CardContent className="opacity-30">
            {lockedContent || (
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature={featureInfo.name}
      />
    </>
  )
}
