import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'

interface PlanProtectionProps {
  feature: string
  requiresPro?: boolean
  requiresPremium?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PlanProtection = ({ 
  feature, 
  requiresPro = false, 
  requiresPremium = false, 
  children, 
  fallback 
}: PlanProtectionProps) => {
  const { currentPlan } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const hasAccess = () => {
    if (requiresPremium && currentPlan !== 'premium') return false
    if (requiresPro && currentPlan === 'basico') return false
    return true
  }

  const handleProtectedAction = () => {
    if (!hasAccess()) {
      setShowUpgradeModal(true)
      return
    }
  }

  if (!hasAccess()) {
    return (
      <>
        {fallback || (
          <div 
            onClick={handleProtectedAction}
            className="cursor-pointer opacity-50 hover:opacity-75 transition-opacity"
          >
            {children}
          </div>
        )}
        <UpgradeModal 
          open={showUpgradeModal} 
          onOpenChange={setShowUpgradeModal}
          feature={feature}
        />
      </>
    )
  }

  return <>{children}</>
}