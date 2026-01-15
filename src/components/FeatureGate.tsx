import { useState, cloneElement, isValidElement, ReactNode, ReactElement } from 'react'
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription'
import { UpgradeModal } from './UpgradeModal'
import { Badge } from '@/components/ui/badge'
import { Lock, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Feature = 
  | 'whatsapp_notifications'
  | 'google_calendar'
  | 'reports'
  | 'advanced_reports'
  | 'referral_program'
  | 'referral_history'
  | 'goals'
  | 'public_page'
  | 'public_page_design'
  | 'public_page_advanced'
  | 'color_customization'
  | 'dashboard_advanced_cards'
  | 'unlimited_clients'
  | 'unlimited_sessions'
  | 'packages'

// Define which plan is required for each feature
export const FEATURE_REQUIREMENTS: Record<Feature, SubscriptionPlan> = {
  whatsapp_notifications: 'premium',
  google_calendar: 'premium',
  reports: 'pro',
  advanced_reports: 'premium',
  referral_program: 'pro',
  referral_history: 'premium',
  goals: 'pro',
  public_page: 'pro',
  public_page_design: 'premium',
  public_page_advanced: 'premium',
  color_customization: 'premium',
  dashboard_advanced_cards: 'pro',
  unlimited_clients: 'premium',
  unlimited_sessions: 'pro',
  packages: 'pro',
}

// Feature descriptions for upgrade modal
export const FEATURE_INFO: Record<Feature, { name: string; benefit: string }> = {
  whatsapp_notifications: {
    name: 'Notificações por WhatsApp',
    benefit: 'Envie lembretes automáticos de sessão diretamente no WhatsApp dos seus pacientes.'
  },
  google_calendar: {
    name: 'Integração com Google Agenda',
    benefit: 'Sincronize automaticamente suas sessões com o Google Agenda e nunca perca um compromisso.'
  },
  reports: {
    name: 'Relatórios',
    benefit: 'Gere relatórios completos sobre sessões, pagamentos e evolução dos pacientes.'
  },
  advanced_reports: {
    name: 'Relatórios Avançados',
    benefit: 'Exporte relatórios em PDF e Excel com filtros personalizados por período, cliente e status.'
  },
  referral_program: {
    name: 'Programa de Indicação',
    benefit: 'Ganhe comissões indicando colegas para a plataforma e aumente sua renda.'
  },
  referral_history: {
    name: 'Histórico de Transações',
    benefit: 'Visualize o histórico completo de pagamentos e comissões do programa de indicação.'
  },
  goals: {
    name: 'Metas e Progresso',
    benefit: 'Defina metas de sessões, receita e pacientes, e acompanhe seu progresso em tempo real.'
  },
  public_page: {
    name: 'Página Pública de Agendamento',
    benefit: 'Tenha uma página profissional onde pacientes podem agendar sessões diretamente.'
  },
  public_page_design: {
    name: 'Design da Página Pública',
    benefit: 'Personalize cores, logo e aparência da sua página de agendamento.'
  },
  public_page_advanced: {
    name: 'Configurações Avançadas',
    benefit: 'Defina políticas de cancelamento, limites de agendamento e mensagens personalizadas.'
  },
  color_customization: {
    name: 'Personalização de Cores',
    benefit: 'Personalize as cores da plataforma para combinar com sua marca.'
  },
  dashboard_advanced_cards: {
    name: 'Cards Avançados do Dashboard',
    benefit: 'Visualize métricas avançadas como ticket médio, receita por canal e progresso de metas.'
  },
  unlimited_clients: {
    name: 'Pacientes Ilimitados',
    benefit: 'Cadastre quantos pacientes precisar, sem limites.'
  },
  unlimited_sessions: {
    name: 'Sessões Ilimitadas',
    benefit: 'Agende sessões ilimitadas por paciente.'
  },
  packages: {
    name: 'Pacotes de Sessões',
    benefit: 'Crie pacotes de sessões com preços especiais e controle o consumo de cada paciente.'
  }
}

interface FeatureGateProps {
  feature: Feature
  children: ReactNode
  /** If true, shows a locked overlay instead of hiding content */
  showLocked?: boolean
  /** Custom badge text */
  badgeText?: string
  /** If true, renders nothing when feature is locked */
  hideWhenLocked?: boolean
  /** Custom className for the wrapper */
  className?: string
  /** If true, clicking on locked content opens upgrade modal */
  clickToUpgrade?: boolean
}

export const FeatureGate = ({
  feature,
  children,
  showLocked = true,
  badgeText,
  hideWhenLocked = false,
  className,
  clickToUpgrade = true
}: FeatureGateProps) => {
  const { currentPlan, hasAccessToFeature, getRequiredPlanForFeature } = useSubscription()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const hasAccess = hasAccessToFeature(feature)
  const requiredPlan = getRequiredPlanForFeature(feature)
  const featureInfo = FEATURE_INFO[feature]
  
  // User has access, render children normally
  if (hasAccess) {
    return <>{children}</>
  }
  
  // Hide completely when locked
  if (hideWhenLocked) {
    return null
  }
  
  // Get appropriate badge text
  const getPlanBadgeText = () => {
    if (badgeText) return badgeText
    if (requiredPlan === 'premium') return 'Premium'
    return 'Desbloqueie no plano Profissional'
  }
  
  const handleClick = (e: React.MouseEvent) => {
    if (clickToUpgrade) {
      e.preventDefault()
      e.stopPropagation()
      setShowUpgradeModal(true)
    }
  }
  
  return (
    <>
      <div 
        className={cn(
          "relative",
          clickToUpgrade && "cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        {/* Locked overlay */}
        {showLocked && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                requiredPlan === 'premium' 
                  ? "bg-gradient-to-br from-amber-400 to-amber-600" 
                  : "bg-gradient-primary"
              )}>
                {requiredPlan === 'premium' ? (
                  <Crown className="w-5 h-5 text-white" />
                ) : (
                  <Lock className="w-5 h-5 text-white" />
                )}
              </div>
              <Badge 
                variant={requiredPlan === 'premium' ? 'warning' : 'default'}
                className="text-xs"
              >
                {getPlanBadgeText()}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Content with reduced opacity */}
        <div className={cn(
          showLocked && "opacity-40 pointer-events-none select-none"
        )}>
          {children}
        </div>
      </div>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature={featureInfo.name}
      />
    </>
  )
}

// Badge component to show on features that require higher plan
interface LockedFeatureBadgeProps {
  feature: Feature
  className?: string
  showIcon?: boolean
}

export const LockedFeatureBadge = ({ 
  feature, 
  className,
  showIcon = true 
}: LockedFeatureBadgeProps) => {
  const { hasAccessToFeature, getRequiredPlanForFeature } = useSubscription()
  
  // Don't show badge if user has access
  if (hasAccessToFeature(feature)) {
    return null
  }
  
  const requiredPlan = getRequiredPlanForFeature(feature)
  const isPremium = requiredPlan === 'premium'
  
  return (
    <Badge 
      variant={isPremium ? 'warning' : 'default'}
      className={cn("text-[10px] gap-1", className)}
    >
      {showIcon && (isPremium ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />)}
      {isPremium ? 'Premium' : 'Pro'}
    </Badge>
  )
}

// Re-export NewFeatureBadge from dedicated file for backwards compatibility
export { NewFeatureBadge } from './NewFeatureBadge'
