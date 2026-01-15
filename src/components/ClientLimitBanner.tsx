import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Crown } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'

interface ClientLimitBannerProps {
  currentCount: number
  className?: string
}

export const ClientLimitBanner = ({ currentCount, className }: ClientLimitBannerProps) => {
  const { currentPlan, planLimits, canAddClient } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Don't show banner if user can still add clients
  if (canAddClient(currentCount)) {
    return null
  }
  
  const maxClients = planLimits.maxClients
  const planName = currentPlan === 'basico' ? 'Básico' : 'Profissional'
  
  return (
    <>
      <Alert variant="destructive" className={`py-3 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm">
              Você atingiu o limite de <strong>{maxClients} pacientes</strong> do plano {planName}. 
              Atualize para gerenciar mais pacientes.
            </span>
          </div>
          <Button 
            size="sm" 
            className="shrink-0"
            onClick={() => setShowUpgradeModal(true)}
          >
            <Crown className="w-4 h-4 mr-2" />
            Fazer Upgrade
          </Button>
        </div>
      </Alert>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature="Pacientes Ilimitados"
      />
    </>
  )
}

// Component to show when a specific client is over the limit
interface LockedClientOverlayProps {
  clientIndex: number
  maxClients: number
  onUpgradeClick: () => void
}

export const LockedClientOverlay = ({ 
  clientIndex, 
  maxClients,
  onUpgradeClick 
}: LockedClientOverlayProps) => {
  // Client is within limit
  if (clientIndex < maxClients) {
    return null
  }
  
  return (
    <div 
      className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        onUpgradeClick()
      }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-full">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-xs text-destructive font-medium">Limite atingido</span>
      </div>
    </div>
  )
}
