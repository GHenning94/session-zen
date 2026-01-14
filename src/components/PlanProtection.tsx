import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'
import { Feature, FEATURE_INFO, FEATURE_REQUIREMENTS } from './FeatureGate'

interface PlanProtectionProps {
  feature: Feature | string
  requiresPro?: boolean
  requiresPremium?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Map old feature names to new Feature type
const LEGACY_FEATURE_MAP: Record<string, Feature> = {
  'hasDesignCustomization': 'public_page_design',
  'hasAdvancedSettings': 'public_page_advanced',
  'hasGoogleCalendar': 'google_calendar',
  'hasWhatsAppNotifications': 'whatsapp_notifications',
  'hasAdvancedReports': 'advanced_reports',
  'hasColorCustomization': 'color_customization',
}

export const PlanProtection = ({ 
  feature, 
  requiresPro = false, 
  requiresPremium = false, 
  children, 
  fallback 
}: PlanProtectionProps) => {
  const { currentPlan, hasAccessToFeature } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Convert legacy feature name to new Feature type
  const resolvedFeature = LEGACY_FEATURE_MAP[feature] || feature as Feature

  const hasAccess = () => {
    // First check using new feature system if it's a valid Feature
    if (resolvedFeature in FEATURE_REQUIREMENTS) {
      return hasAccessToFeature(resolvedFeature as Feature)
    }
    
    // Fallback to old logic
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

  // Get feature display name
  const getFeatureName = () => {
    if (resolvedFeature in FEATURE_INFO) {
      return FEATURE_INFO[resolvedFeature as Feature].name
    }
    return feature
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
          feature={getFeatureName()}
        />
      </>
    )
  }

  return <>{children}</>
}