import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Zap, Star, ArrowRight, Loader2, AlertTriangle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { DowngradeRetentionFlow } from "./DowngradeRetentionFlow"
import { toast } from "sonner"

interface ProrationData {
  proratedAmount: number
  proratedAmountFormatted: string
  creditAmount: number
  creditFormatted: string
  daysRemaining: number
  periodEndDate: string
  currentPlan: string
  newPlan: string
  isTierChange: boolean
  newPlanPriceFormatted: string
}

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
    'Pacientes ilimitados',
    'Programa de indicação completo',
    'Relatórios avançados (PDF, filtros, períodos)',
    'Integração com Google Agenda',
    'Integração com WhatsApp',
    'Personalização total da plataforma (cores)',
    'Página pública com personalização completa',
    'Backup automático',
    'Suporte prioritário'
  ],
  pro: [
    'Dashboard completo',
    'Até 50 pacientes',
    'Sessões ilimitadas',
    'Sessões recorrentes e pacotes',
    'Metas e relatórios padrão',
    'Prontuários completos (anamnese + evolução)',
    'Página pública de agendamento',
    'Programa de indicação',
    'Modo claro e escuro'
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
  
  // Se o plano atual é anual (pro ou premium), força o ciclo para anual
  const isCurrentPlanAnnual = currentBillingInterval === 'yearly' || currentBillingInterval === 'annual'
  const shouldHideSwitch = isCurrentPlanAnnual && (currentPlan === 'pro' || currentPlan === 'premium')
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(shouldHideSwitch ? 'annual' : 'monthly')
  const [downgradeModal, setDowngradeModal] = useState<{
    open: boolean
    targetPlan: Plan | null
  }>({ open: false, targetPlan: null })
  const [prorationModal, setProrationModal] = useState<{
    open: boolean
    targetPlan: Plan | null
    data: ProrationData | null
    isLoading: boolean
    error: string | null
  }>({ open: false, targetPlan: null, data: null, isLoading: false, error: null })

  const allPlans: Plan[] = [
    {
      id: 'basico',
      name: 'Básico',
      monthlyPrice: 'R$ 0',
      annualPrice: 'R$ 0',
      period: '/mês',
      icon: <Star className="h-5 w-5" />,
      description: 'Ideal para começar',
      features: ['Dashboard (versão limitada)', 'Até 10 pacientes', 'Até 10 sessões por paciente', 'Prontuários básicos'],
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
      features: ['Dashboard completo', 'Até 50 pacientes', 'Sessões ilimitadas', 'Página pública', 'Programa de indicação'],
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
      features: ['Tudo do Profissional', 'Pacientes ilimitados', 'Relatórios PDF', 'Integração Google/WhatsApp', 'Suporte prioritário'],
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
    // billing_interval no banco pode ser: 'monthly', 'yearly', ou null (para basico)
    const isCurrentPlanAndCycle = plan.id === currentPlan && (
      plan.id === 'basico' || 
      (billingCycle === 'monthly' && currentBillingInterval === 'monthly') ||
      (billingCycle === 'annual' && (currentBillingInterval === 'yearly' || currentBillingInterval === 'annual'))
    )
    
    if (isCurrentPlanAndCycle) return
    
    // Verifica se é downgrade
    const isDowngrade = plan.planLevel < currentPlanLevel
    
    if (isDowngrade) {
      // Mostra modal de retenção para downgrade
      setDowngradeModal({ open: true, targetPlan: plan })
      return
    }
    
    // Se o usuário já tem plano pago, mostrar modal de proration
    if (currentPlan !== 'basico') {
      const stripePrice = billingCycle === 'monthly' ? plan.monthlyStripePrice : plan.annualStripePrice
      
      setProrationModal({
        open: true,
        targetPlan: plan,
        data: null,
        isLoading: true,
        error: null
      })

      try {
        // SEMPRE usar Stripe para proration
        const { data, error } = await supabase.functions.invoke('preview-proration', {
          body: { 
            newPriceId: stripePrice,
            planId: plan.id,
            billingInterval: billingCycle
          }
        })

        if (error) throw error

        console.log('[UpgradePlanCard] ✅ Proration data received:', data)
        setProrationModal(prev => ({
          ...prev,
          data,
          isLoading: false
        }))
      } catch (error: any) {
        console.error('[UpgradePlanCard] ❌ Error fetching proration:', error)
        setProrationModal(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Erro ao calcular valor proporcional'
        }))
      }
      return
    }
    
    // Upgrade normal para usuários no plano básico
    await processUpgrade(plan)
  }

  const handleConfirmProration = async () => {
    if (!prorationModal.targetPlan || !user) return

    setLoading(true)
    try {
      const stripePrice = billingCycle === 'monthly' 
        ? prorationModal.targetPlan.monthlyStripePrice 
        : prorationModal.targetPlan.annualStripePrice
      
      // SEMPRE usar Stripe para upgrade
      console.log('[UpgradePlanCard] 🚀 Processing upgrade via Stripe')
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { 
          newPriceId: stripePrice,
          planId: prorationModal.targetPlan.id,
          billingInterval: billingCycle
        }
      })

      if (error) throw error

      if (data?.requiresPayment && data?.paymentUrl) {
        // Store for welcome modal after payment
        sessionStorage.setItem('pending_tier_upgrade', data.newPlan)
        // ✅ Marcar que está indo para checkout externo (Stripe)
        sessionStorage.setItem('stripe_checkout_active', 'true')
        toast.info(`Você será redirecionado para pagar o valor proporcional de ${data.proratedAmountFormatted}`)
        window.location.href = data.paymentUrl
      } else {
        // Upgrade completed without additional payment
        toast.success(data?.message || 'Upgrade realizado com sucesso!')
        sessionStorage.setItem('show_upgrade_welcome', data.newPlan)
        setProrationModal({ open: false, targetPlan: null, data: null, isLoading: false, error: null })
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      console.error('[UpgradePlanCard] ❌ Error processing upgrade:', err)
      toast.error(`Erro ao processar upgrade: ${err.message || 'Tente novamente.'}`)
    } finally {
      setLoading(false)
    }
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
    
    // Para planos pagos (usuários no plano básico), usar Stripe checkout
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
        // ✅ Marcar que está indo para checkout externo (Stripe)
        sessionStorage.setItem('stripe_checkout_active', 'true')
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
    // Após o período, é automaticamente movido para o novo plano
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { 
          action: 'downgrade',
          targetPlan: plan.id,
          targetInterval: billingCycle === 'annual' ? 'yearly' : 'monthly'
        }
      })

      if (error) throw error
      
      const message = data?.message || 'Downgrade agendado! Você permanecerá no plano atual até o fim do período de assinatura.'
      toast.success(message)
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

        <CardContent className="space-y-4 pt-2">
          {/* Seletor de Ciclo de Cobrança - esconder se plano atual é anual (pro ou premium) */}
          {!shouldHideSwitch && (
            <div className="flex items-center justify-center gap-2 md:gap-3 py-2 flex-wrap">
              <span className={`text-xs md:text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Mensal
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={billingCycle === 'annual'}
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform" style={{ transform: billingCycle === 'annual' ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
              <div className="flex items-center gap-1">
                <span className={`text-xs md:text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Anual
                </span>
                {billingCycle === 'annual' && (
                  <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                    Economize 2 meses
                  </Badge>
                )}
              </div>
            </div>
          )}

          {displayedPlans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const isAnnual = billingCycle === 'annual'
            
            // Determina se é o plano atual considerando o ciclo de cobrança
            // Para plano básico, não precisa verificar o ciclo
            // Para planos pagos, verifica se o ciclo atual (monthly/yearly) corresponde ao selecionado
            // billing_interval no banco pode ser: 'monthly', 'yearly', ou null (para basico)
            const isCurrentPlanAndCycle = plan.id === currentPlan && (
              plan.id === 'basico' || 
              (billingCycle === 'monthly' && currentBillingInterval === 'monthly') ||
              (billingCycle === 'annual' && (currentBillingInterval === 'yearly' || currentBillingInterval === 'annual'))
            )
            
            // Profissional sempre com destaque "Mais Popular"
            const isPro = plan.id === 'pro'
            const isUpgrade = plan.planLevel > currentPlanLevel && plan.id !== 'basico'
            
            return (
              <Card 
                key={plan.id} 
                className={`relative border-2 transition-colors ${
                  isCurrentPlanAndCycle 
                    ? 'border-green-500 ring-2 ring-green-500/20' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Badge central - Plano Atual ou Mais Popular */}
                {isCurrentPlanAndCycle && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                    Plano Atual
                  </Badge>
                )}
                {isPro && !isCurrentPlanAndCycle && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap">
                    <Star className="h-2.5 w-2.5" />
                    Mais Popular
                  </Badge>
                )}
                {/* Badge direita - Economize (apenas para planos não atuais) */}
                {isAnnual && plan.id !== 'basico' && !isCurrentPlanAndCycle && (
                  <Badge className="absolute -top-3 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap">Economize 2 meses</Badge>
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
                      <p className="text-xs text-muted-foreground mt-1">Cobrado {plan.id === 'pro' ? 'R$ 298,80' : 'R$ 498,96'} uma vez por ano</p>
                    )}
                    {plan.id === 'basico' && (
                      <p className="text-xs text-muted-foreground mt-1">Sem cartão de crédito</p>
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
                    className={`w-full ${isUpgrade ? 'bg-gradient-primary text-white hover:opacity-90' : ''}`}
                    size="sm"
                    onClick={() => !isCurrentPlanAndCycle && handleChangePlan(plan)}
                    disabled={loading || isCurrentPlanAndCycle}
                    variant={isCurrentPlanAndCycle ? "secondary" : plan.planLevel < currentPlanLevel ? "outline" : plan.id === 'basico' ? "outline" : "default"}
                    style={isCurrentPlanAndCycle ? { pointerEvents: 'none', opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    {loading ? 'Processando...' : isCurrentPlanAndCycle ? 'Plano Atual' : plan.planLevel < currentPlanLevel ? 'Fazer Downgrade' : `Escolher ${plan.name}`}
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

      {/* Modal de proration para upgrade */}
      <Dialog 
        open={prorationModal.open} 
        onOpenChange={(open) => {
          if (!open) {
            setProrationModal({ open: false, targetPlan: null, data: null, isLoading: false, error: null })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Confirmar Upgrade
            </DialogTitle>
          </DialogHeader>

          {prorationModal.isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Calculando valor proporcional...</p>
            </div>
          ) : prorationModal.error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-destructive text-center">{prorationModal.error}</p>
              <Button 
                variant="outline" 
                onClick={() => setProrationModal({ open: false, targetPlan: null, data: null, isLoading: false, error: null })}
              >
                Fechar
              </Button>
            </div>
          ) : prorationModal.data ? (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Você está alterando de <span className="font-semibold text-foreground">{prorationModal.data.currentPlan}</span> para{' '}
                <span className="font-semibold text-primary">{prorationModal.data.newPlan}</span>.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Dias restantes no plano atual:</span>
                  <span className="font-medium">{prorationModal.data.daysRemaining} dias</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Crédito proporcional:</span>
                  <span className="text-green-600 font-medium">- {prorationModal.data.creditFormatted}</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Valor a pagar agora:</span>
                  <span className="text-primary">{prorationModal.data.proratedAmountFormatted}</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Após a alteração, seu próximo ciclo de cobrança será em <span className="font-semibold">{prorationModal.data.periodEndDate}</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setProrationModal({ open: false, targetPlan: null, data: null, isLoading: false, error: null })}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleConfirmProration}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Pagar ${prorationModal.data.proratedAmountFormatted}`
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
