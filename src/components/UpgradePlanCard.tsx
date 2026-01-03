import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Zap, Star, ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { DowngradeRetentionFlow } from "./DowngradeRetentionFlow"
import { toast } from "sonner"

interface Plan {
  id: string
  name: string
  monthlyPrice: string
  annualPrice: string
  period: string
  icon: React.ReactNode
  description: string
  features: string[]
  recommended?: boolean
  monthlyStripePrice: string
  annualStripePrice: string
  currentPlan?: boolean
  annualSubtext?: string
  planLevel: number // 1 = basico, 2 = pro, 3 = premium
}

interface UpgradePlanCardProps {
  currentPlan: string
  currentBillingInterval?: string | null
}

// Mapeia plano para features que serão perdidas em downgrade
const planFeatures: Record<string, string[]> = {
  premium: [
    'Clientes ilimitados',
    'Histórico completo de atendimentos',
    'Relatórios em PDF',
    'Integração com WhatsApp',
    'Suporte prioritário'
  ],
  pro: [
    'Até 20 clientes ativos',
    'Sessões ilimitadas por cliente',
    'Histórico básico de atendimentos',
    'Agendamento online'
  ]
}

const getPlanLevel = (planId: string): number => {
  if (planId === 'basico') return 1
  if (planId === 'pro') return 2
  if (planId === 'premium') return 3
  return 0
}

export const UpgradePlanCard = ({ currentPlan, currentBillingInterval }: UpgradePlanCardProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [downgradeModal, setDowngradeModal] = useState<{
    open: boolean
    targetPlan: Plan | null
  }>({ open: false, targetPlan: null })

  const allPlans: Plan[] = [
    {
      id: 'basico',
      name: 'Básico',
      monthlyPrice: 'R$ 0',
      annualPrice: 'R$ 0',
      period: '/mês',
      icon: <Star className="h-5 w-5" />,
      description: 'Ideal para começar',
      features: ['Até 3 clientes', 'Até 4 sessões por cliente', 'Agendamento básico'],
      monthlyStripePrice: '',
      annualStripePrice: '',
      currentPlan: currentPlan === 'basico',
      planLevel: 1
    },
    {
      id: 'pro',
      name: 'Profissional',
      monthlyPrice: 'R$ 29,90',
      annualPrice: 'R$ 24,90',
      period: '/mês',
      icon: <Zap className="h-5 w-5" />,
      description: 'Para profissionais em crescimento',
      features: ['Até 20 clientes', 'Sessões ilimitadas', 'Histórico básico', 'Agendamento online'],
      recommended: true,
      monthlyStripePrice: 'price_1SSMNgCP57sNVd3laEmlQOcb',
      annualStripePrice: 'price_1SSMOdCP57sNVd3la4kMOinN',
      currentPlan: currentPlan === 'pro',
      annualSubtext: '12x R$ 24,90 = R$ 298,80/ano',
      planLevel: 2
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 'R$ 49,90',
      annualPrice: 'R$ 41,58',
      period: '/mês',
      icon: <Crown className="h-5 w-5" />,
      description: 'Máximo poder e recursos',
      features: ['Clientes ilimitados', 'Histórico completo', 'Relatórios PDF', 'Integração WhatsApp'],
      monthlyStripePrice: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
      annualStripePrice: 'price_1SSMP7CP57sNVd3lSf4oYINX',
      currentPlan: currentPlan === 'premium',
      annualSubtext: '12x R$ 41,58 = R$ 498,96/ano',
      planLevel: 3
    }
  ]

  const currentPlanInfo = allPlans.find(plan => plan.id === currentPlan)
  const currentPlanLevel = getPlanLevel(currentPlan)

  const handleChangePlan = async (plan: Plan) => {
    if (!user) return
    
    // Verifica se é o plano atual no mesmo ciclo
    const isCurrentPlanAndCycle = plan.id === currentPlan && (
      plan.id === 'basico' || 
      (billingCycle === 'monthly' && currentBillingInterval === 'month') ||
      (billingCycle === 'annual' && currentBillingInterval === 'year')
    )
    
    if (isCurrentPlanAndCycle) return
    
    // Verifica se é downgrade
    const isDowngrade = plan.planLevel < currentPlanLevel
    
    if (isDowngrade) {
      // Mostra modal de retenção para downgrade
      setDowngradeModal({ open: true, targetPlan: plan })
      return
    }
    
    // Upgrade normal
    await processUpgrade(plan)
  }

  const processUpgrade = async (plan: Plan) => {
    if (!user) return
    
    // Se for plano básico (gratuito), usar função de teste
    if (plan.id === 'basico') {
      setLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('test-upgrade', {
          body: { plan: 'basico' }
        })

        if (error) throw error
        
        toast.success('Plano alterado com sucesso para Básico!')
        window.location.reload()
      } catch (error) {
        console.error('Erro ao alterar plano:', error)
        toast.error('Erro ao alterar plano. Tente novamente.')
      } finally {
        setLoading(false)
      }
      return
    }
    
    // Para planos pagos, usar Stripe
    setLoading(true)
    try {
      const stripePrice = billingCycle === 'monthly' ? plan.monthlyStripePrice : plan.annualStripePrice
      const referralCode = localStorage.getItem('referral_code') || sessionStorage.getItem('pending_referral')
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: stripePrice,
          planName: plan.name,
          returnUrl: window.location.origin,
          referralCode: referralCode || undefined
        }
      })

      if (error) throw error

      if (data?.url) {
        window.open(data.url, '_self')
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      toast.error('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDowngrade = async () => {
    if (!downgradeModal.targetPlan) return
    
    const plan = downgradeModal.targetPlan
    
    // Para downgrade, chamamos a função de cancelamento/downgrade
    // O usuário permanece no plano atual até o fim do período
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { 
          action: 'downgrade',
          targetPlan: plan.id
        }
      })

      if (error) throw error
      
      toast.success(`Downgrade agendado! Você permanecerá no plano atual até o fim do período de assinatura.`)
      window.location.reload()
    } catch (error) {
      console.error('Erro ao processar downgrade:', error)
      toast.error('Erro ao processar downgrade. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewAllPlans = () => {
    navigate('/upgrade')
  }

  // Lógica de exibição dos planos:
  // - Plano free (basico): mostrar todos os 3 planos
  // - Plano profissional (pro): mostrar apenas pro (atual) e premium
  // - Plano premium: mostrar apenas premium (atual)
  const getDisplayedPlans = () => {
    if (currentPlan === 'basico') {
      return allPlans // Mostrar todos os planos
    } else if (currentPlan === 'pro') {
      return allPlans.filter(plan => plan.id === 'pro' || plan.id === 'premium')
    } else if (currentPlan === 'premium') {
      return allPlans.filter(plan => plan.id === 'premium')
    }
    return allPlans
  }

  const displayedPlans = getDisplayedPlans()

  // Features perdidas no downgrade
  const getLostFeatures = (): string[] => {
    if (currentPlan === 'premium') {
      return planFeatures.premium
    }
    if (currentPlan === 'pro') {
      return planFeatures.pro
    }
    return []
  }

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-primary" />
            Planos de assinatura
          </CardTitle>
          <CardDescription>
            {currentPlanInfo ? `Você está no plano ${currentPlanInfo.name}` : 'Escolha um plano para começar'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Seletor de Ciclo de Cobrança */}
          <div className="flex items-center justify-center gap-2 md:gap-3 py-2 flex-wrap">
            <span className={`text-xs md:text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Mensal
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 rounded-full p-0 shrink-0"
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-primary transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : ''}`} />
            </Button>
            <div className="flex items-center gap-1">
              <span className={`text-xs md:text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Anual
              </span>
              <Badge variant="secondary" className="text-[10px] md:text-xs">-17%</Badge>
            </div>
          </div>

          {displayedPlans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const isAnnual = billingCycle === 'annual'
            
            // Determina se é o plano atual considerando o ciclo de cobrança
            // Para plano básico, não precisa verificar o ciclo
            // Para planos pagos, verifica se o ciclo atual (monthly/yearly) corresponde ao selecionado
            const isCurrentPlanAndCycle = plan.id === currentPlan && (
              plan.id === 'basico' || 
              (billingCycle === 'monthly' && currentBillingInterval === 'month') ||
              (billingCycle === 'annual' && currentBillingInterval === 'year')
            )
            
            // Premium sempre com destaque quando não é o plano atual no ciclo
            const isPremium = plan.id === 'premium'
            const showHighlight = isPremium && !isCurrentPlanAndCycle
            
            return (
              <Card 
                key={plan.id} 
                className={`relative border-2 transition-colors ${
                  isCurrentPlanAndCycle 
                    ? 'border-green-500 ring-2 ring-green-500/20' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isCurrentPlanAndCycle && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 hover:bg-green-500 text-white px-3 py-1 text-xs font-medium">
                    Plano Atual
                  </Badge>
                )}
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {plan.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {isAnnual && plan.annualSubtext && (
                      <p className="text-xs text-muted-foreground mt-1">{plan.annualSubtext}</p>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => !isCurrentPlanAndCycle && handleChangePlan(plan)}
                    disabled={loading || isCurrentPlanAndCycle}
                    variant={isCurrentPlanAndCycle ? "secondary" : showHighlight ? "default" : "outline"}
                    style={isCurrentPlanAndCycle ? { pointerEvents: 'none', opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    {loading ? 'Processando...' : isCurrentPlanAndCycle ? 'Plano Atual' : `Escolher ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}

          <Button 
            variant="ghost" 
            className="w-full text-sm" 
            onClick={handleViewAllPlans}
          >
            Ver detalhes completos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Modal de retenção para downgrade */}
      <DowngradeRetentionFlow
        open={downgradeModal.open}
        onOpenChange={(open) => setDowngradeModal({ ...downgradeModal, open })}
        onConfirmDowngrade={handleConfirmDowngrade}
        currentPlanName={currentPlanInfo?.name || ''}
        targetPlanName={downgradeModal.targetPlan?.name || ''}
        lostFeatures={getLostFeatures()}
      />
    </>
  )
}
