import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, ArrowLeft, Crown, Zap, Star, Loader2, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { DowngradeRetentionFlow } from "@/components/DowngradeRetentionFlow"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Mapeia plano para features que serão perdidas em downgrade
const planFeatures: Record<string, string[]> = {
  premium: [
    'Pacientes ilimitados',
    'Programa de indicação completo',
    'Relatórios avançados (PDF, Excel, filtros)',
    'Integração com Google Agenda',
    'Integração com WhatsApp',
    'Personalização total (tema + cores)',
    'Página pública com personalização completa',
    'Backup automático',
    'Suporte prioritário'
  ],
  pro: [
    'Dashboard completo',
    'Até 50 pacientes',
    'Sessões ilimitadas',
    'Sessões recorrentes e pacotes',
    'Metas e relatórios simples',
    'Prontuários completos (anamnese + evolução)',
    'Página pública padrão',
    'Programa de indicação',
    'Tema claro e escuro'
  ]
}

const getPlanLevel = (planId: string): number => {
  if (planId === 'basico') return 1
  if (planId === 'pro') return 2
  if (planId === 'premium') return 3
  return 0
}

// Price IDs por gateway
const STRIPE_PRICES = {
  pro_monthly: 'price_1SSMNgCP57sNVd3laEmlQOcb',
  pro_annual: 'price_1SSMOdCP57sNVd3la4kMOinN',
  premium_monthly: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
  premium_annual: 'price_1SSMP7CP57sNVd3lSf4oYINX'
}

export default function Upgrade() {
  const { user } = useAuth()
  const { currentPlan, billingInterval } = useSubscription()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean
    targetPlan: any
    prorationData: {
      proratedAmount: number
      proratedAmountFormatted: string
      creditAmount: number
      creditFormatted: string
      daysRemaining: number
      totalCycleDays: number
      periodEndDate: string
      currentPlan: string
      currentPlanPrice: number
      currentPlanPriceFormatted: string
      newPlan: string
      newPlanPrice: number
      newPlanPriceFormatted: string
      isTierChange: boolean
      isUpgrade: boolean
      explanation: string
      // Novas propriedades para desconto
      prorationApplied: boolean
      noProrationReason: string | null
      hasActiveDiscount: boolean
      discountType: string | null
      discountDetails: string | null
    } | null
    isLoadingProration: boolean
  }>({ open: false, targetPlan: null, prorationData: null, isLoadingProration: false })
  const [downgradeModal, setDowngradeModal] = useState<{
    open: boolean
    targetPlan: any
  }>({ open: false, targetPlan: null })

  useEffect(() => { if (!user) navigate('/login') }, [user, navigate])

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const currentPlanLevel = getPlanLevel(currentPlan)

  // Determinar o billingInterval atual normalizado para comparação
  const currentBillingInterval = billingInterval || null
  
  const plans = [
    { 
      id: 'basico', 
      name: 'Básico', 
      price: 'Grátis', 
      period: '', 
      icon: <Star className="h-6 w-6" />, 
      description: 'Ideal para começar', 
      features: [ 
        'Dashboard limitado', 
        'Agenda completa', 
        'Até 10 pacientes',
        'Até 10 sessões por paciente', 
        'Prontuários Completos',
        'Gerenciamento de pagamentos' 
      ],
      recommended: false, 
      stripePrice: null, 
      current: currentPlan === 'basico',
      planLevel: 1,
      monthlyValue: 0,
      annualValue: 0
    },
    { 
      id: 'pro', 
      name: 'Profissional', 
      price: billingCycle === 'monthly' ? 'R$ 29,90' : 'R$ 299,00', 
      period: billingCycle === 'monthly' ? '/mês' : '/ano', 
      icon: <Zap className="h-6 w-6" />, 
      description: 'Para profissionais em crescimento', 
      features: [ 
        'Dashboard completo', 
        'Até 50 pacientes',
        'Sessões ilimitadas', 
        'Sessões recorrentes e pacotes',
        'Metas e relatórios simples',
        'Prontuários completos',
        'Página pública padrão',
        'Programa de indicação',
        'Tema claro e escuro'
      ],
      recommended: true, 
      stripePrice: billingCycle === 'monthly' ? STRIPE_PRICES.pro_monthly : STRIPE_PRICES.pro_annual, 
      // Verificar se é o plano atual E o ciclo de cobrança corresponde
      current: currentPlan === 'pro' && (
        (billingCycle === 'monthly' && currentBillingInterval === 'monthly') ||
        (billingCycle === 'annual' && (currentBillingInterval === 'yearly' || currentBillingInterval === 'annual'))
      ),
      annualPrice: 'R$ 299,00',
      annualDiscount: billingCycle === 'annual' ? 'Economize 2 meses' : null,
      planLevel: 2,
      monthlyValue: 29.90,
      annualValue: 299.00
    },
    { 
      id: 'premium', 
      name: 'Premium', 
      price: billingCycle === 'monthly' ? 'R$ 49,90' : 'R$ 499,00', 
      period: billingCycle === 'monthly' ? '/mês' : '/ano', 
      icon: <Crown className="h-6 w-6" />, 
      description: 'Máximo poder e recursos', 
      features: [ 
        'Tudo do Profissional', 
        'Pacientes ilimitados',
        'Programa de indicação completo', 
        'Relatórios avançados (PDF, Excel, filtros)',
        'Integração Google Agenda', 
        'Integração WhatsApp',
        'Personalização total (tema + cores)',
        'Página pública personalizada',
        'Backup automático',
        'Suporte prioritário' 
      ],
      recommended: false, 
      stripePrice: billingCycle === 'monthly' ? STRIPE_PRICES.premium_monthly : STRIPE_PRICES.premium_annual, 
      // Verificar se é o plano atual E o ciclo de cobrança corresponde
      current: currentPlan === 'premium' && (
        (billingCycle === 'monthly' && currentBillingInterval === 'monthly') ||
        (billingCycle === 'annual' && (currentBillingInterval === 'yearly' || currentBillingInterval === 'annual'))
      ),
      annualPrice: 'R$ 499,00',
      annualDiscount: billingCycle === 'annual' ? 'Economize 2 meses' : null,
      planLevel: 3,
      monthlyValue: 49.90,
      annualValue: 499.00
    }
  ]

  const handlePlanClick = async (plan: typeof plans[0]) => {
    if (!user) return
    
    // Se é o plano atual, não fazer nada
    if (plan.current) return
    
    const isDowngrade = plan.planLevel < currentPlanLevel
    const isUpgrade = plan.planLevel > currentPlanLevel
    const isSameTierDifferentInterval = plan.planLevel === currentPlanLevel && !plan.current
    
    if (isDowngrade) {
      // Mostrar modal de retenção para downgrade
      setDowngradeModal({ open: true, targetPlan: plan })
      return
    }
    
    if ((isUpgrade || isSameTierDifferentInterval) && currentPlan !== 'basico') {
      // Para upgrade de plano pago ou mudança de período, buscar preview de proration
      setUpgradeModal({ 
        open: true, 
        targetPlan: plan, 
        prorationData: null,
        isLoadingProration: true
      })
      
      // Buscar preview de proration
      try {
        const { data, error } = await supabase.functions.invoke('preview-proration', {
          body: { newPriceId: plan.stripePrice }
        })
        
        if (error) throw error
        
        setUpgradeModal(prev => ({ 
          ...prev, 
          prorationData: data,
          isLoadingProration: false
        }))
      } catch (error) {
        console.error('Erro ao buscar preview de proration:', error)
        setUpgradeModal(prev => ({ 
          ...prev, 
          isLoadingProration: false
        }))
      }
      return
    }
    
    // Upgrade de plano gratuito ou primeiro plano - usa checkout com roteamento inteligente
    await processCheckout(plan)
  }

  /**
   * Processa checkout - SEMPRE via Stripe
   * Desconto de indicação é aplicado via cupom Stripe
   * Comissões são calculadas no webhook Stripe e pagas via Asaas (payout)
   */
  const processCheckout = async (plan: typeof plans[0]) => {
    if (!user || !plan.stripePrice) {
      // Para plano básico, usar função de teste
      if (plan.id === 'basico') {
        setLoading(true)
        try {
          const { data, error } = await supabase.functions.invoke('test-upgrade', {
            body: { plan: 'basico' }
          })
          if (error) throw error
          toast.success('Plano alterado com sucesso para Básico!')
          navigate('/dashboard')
        } catch (error) {
          console.error('Erro ao alterar plano:', error)
          toast.error('Erro ao alterar plano. Tente novamente.')
        } finally {
          setLoading(false)
        }
      }
      return
    }
    
    setLoading(true)
    try {
      // SEMPRE usar Stripe para checkout de assinatura
      // Usuários indicados recebem desconto via cupom Stripe
      const { data, error } = await supabase.functions.invoke('create-checkout', { 
        body: { 
          priceId: plan.stripePrice, 
          returnUrl: window.location.origin
        } 
      })
      if (error) throw error
      if (data?.url) {
        // ✅ Marcar que está indo para checkout externo (Stripe) - em AMBOS os storages
        localStorage.setItem('stripe_checkout_active', 'true')
        sessionStorage.setItem('stripe_checkout_active', 'true')
        // ✅ Salvar plano anterior e alvo no localStorage
        localStorage.setItem('pending_checkout_plan', plan.id)
        localStorage.setItem('pending_previous_plan', currentPlan)
        console.log('[Upgrade] 📝 Saved to localStorage - pending_checkout_plan:', plan.id, ', pending_previous_plan:', currentPlan)
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error)
      toast.error(`Erro ao processar plano: ${error.message || 'Verifique os IDs de preço no Stripe Dashboard'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmUpgrade = async () => {
    if (!upgradeModal.targetPlan) return
    
    const plan = upgradeModal.targetPlan
    const isTierChange = upgradeModal.prorationData?.isTierChange ?? true
    
    setUpgradeModal({ ...upgradeModal, open: false, prorationData: null, isLoadingProration: false })
    setLoading(true)
    
    // ✅ Salvar plano anterior ANTES de iniciar o upgrade - usar localStorage
    localStorage.setItem('pending_previous_plan', currentPlan)
    console.log('[Upgrade] 📝 Saved previous plan before upgrade:', currentPlan)
    
    try {
      // Usar a função de upgrade com proration para assinaturas existentes
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { newPriceId: plan.stripePrice }
      })
      
      if (error) throw error
      
      if (data?.requiresPayment && data?.paymentUrl) {
        // Guardar se é mudança de tier para o modal de boas vindas - usar localStorage
        if (isTierChange) {
          localStorage.setItem('pending_tier_upgrade', data.newPlan)
        }
        // ✅ Marcar que está indo para checkout externo (Stripe) - em AMBOS os storages
        localStorage.setItem('stripe_checkout_active', 'true')
        sessionStorage.setItem('stripe_checkout_active', 'true')
        // Se precisa pagar valor proporcional, redirecionar para checkout
        toast.info(`Você será redirecionado para pagar o valor proporcional de ${data.proratedAmountFormatted}`)
        window.location.href = data.paymentUrl
      } else {
        // Upgrade realizado com sucesso sem pagamento adicional (cobrado automaticamente)
        toast.success(data?.message || 'Upgrade realizado com sucesso!')
        
        // Só mostrar modal de boas vindas se for mudança de tier
        if (isTierChange && data?.newPlan) {
          // ✅ Salvar features desbloqueadas ANTES de navegar
          if (user?.id) {
            const FEATURE_TO_PLAN: Record<string, string> = {
              whatsapp_notifications: 'premium',
              google_calendar: 'premium',
              reports: 'pro',
              advanced_reports: 'premium',
              report_filters: 'premium',
              referral_program: 'pro',
              referral_history: 'premium',
              // Goals - variantes por localização
              goals: 'pro',
              goals_sidebar: 'pro',
              goals_dashboard_ticket: 'pro',
              goals_dashboard_canal: 'pro',
              goals_orbital: 'pro',
              public_page: 'pro',
              public_page_design: 'premium',
              public_page_advanced: 'premium',
              color_customization: 'premium',
              dashboard_advanced_cards: 'pro',
              unlimited_clients: 'premium',
              unlimited_sessions: 'pro',
              packages: 'pro',
              packages_sidebar: 'pro', // Badge na sidebar (Pacotes)
              recurring_sessions: 'pro',
              recurring_sessions_sidebar: 'pro', // Badge na sidebar (Sessões Recorrentes)
              reports_sidebar: 'pro', // Badge na sidebar (Relatórios)
              referral_program_sidebar: 'pro', // Badge na sidebar (Programa de Indicação)
            }
            
            const PLAN_HIERARCHY: Record<string, number> = {
              basico: 0,
              pro: 1,
              premium: 2
            }
            
            const fromLevel = PLAN_HIERARCHY[currentPlan] || 0
            const toLevel = PLAN_HIERARCHY[data.newPlan] || 0
            
            const newlyUnlocked = Object.entries(FEATURE_TO_PLAN)
              .filter(([_, requiredPlan]) => {
                const requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0
                return requiredLevel > fromLevel && requiredLevel <= toLevel
              })
              .map(([feature]) => feature)
            
            if (newlyUnlocked.length > 0) {
              const key = `recently_unlocked_features_${user.id}`
              const existing = localStorage.getItem(key)
              const current = existing ? JSON.parse(existing) as string[] : []
              const updated = [...new Set([...current, ...newlyUnlocked])]
              localStorage.setItem(key, JSON.stringify(updated))
              console.log('[Upgrade] 🎯 Saved unlocked features:', updated)
            }
            
            // Atualizar last_known_plan para o novo plano
            localStorage.setItem(`last_known_plan_${user.id}`, data.newPlan)
          }
          
          // ✅ CRÍTICO: Definir flag para o modal de boas-vindas ANTES de navegar - usar localStorage
          // Garantir que o modal aparece mesmo em upgrades internos (dentro da plataforma)
          localStorage.setItem('show_upgrade_welcome', data.newPlan)
          sessionStorage.setItem('show_upgrade_welcome', data.newPlan) // Redundância
          console.log('[Upgrade] 🎊 Set show_upgrade_welcome to localStorage AND sessionStorage:', data.newPlan)
          localStorage.removeItem('pending_previous_plan')
        }
        
        // ✅ IMPORTANTE: Usar window.location.href para garantir que o Dashboard recarrega
        // e detecta o modal. navigate() pode causar problemas com o estado React.
        console.log('[Upgrade] 🚀 Redirecting to dashboard with full page reload...')
        window.location.href = '/dashboard'
        return // Evitar que continue executando
      }
    } catch (error: any) {
      console.error('Erro ao processar upgrade:', error)
      toast.error(`Erro ao processar upgrade: ${error.message || 'Tente novamente.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDowngrade = async () => {
    if (!downgradeModal.targetPlan) return
    
    const plan = downgradeModal.targetPlan
    
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
      navigate('/dashboard')
    } catch (error) {
      console.error('Erro ao processar downgrade:', error)
      toast.error('Erro ao processar downgrade. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const getLostFeatures = (): string[] => {
    if (currentPlan === 'premium') {
      return planFeatures.premium
    }
    if (currentPlan === 'pro') {
      return planFeatures.pro
    }
    return []
  }

  const currentPlanInfo = plans.find(p => p.id === currentPlan)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold mb-4">Escolha o plano ideal para o seu consultório</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Compare nossos planos e encontre o que melhor se adapta às suas necessidades</p>
          
          {/* Seletor de Ciclo de Cobrança */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Mensal</span>
            {isMobile ? (
              <Switch
                checked={billingCycle === 'annual'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
              />
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={billingCycle === 'annual'}
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform" style={{ transform: billingCycle === 'annual' ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
            )}
            <span className={`text-sm ${billingCycle === 'annual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Anual</span>
            {billingCycle === 'annual' && (
              <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                Economize 2 meses
              </Badge>
            )}
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = plan.current
            const isCurrentPlanAnnual = currentBillingInterval === 'yearly' || currentBillingInterval === 'annual'
            const isPlanAnnual = billingCycle === 'annual'
            
            // Lógica de upgrade correta:
            // - Premium Mensal atual → Premium Anual é upgrade
            // - Profissional Mensal atual → Profissional Anual, Premium Anual, Premium Mensal são upgrade
            // - Profissional Anual atual → Premium Anual e Premium Mensal são upgrade
            // - Premium Anual atual → Nenhum é upgrade (todos são downgrade)
            
            let shouldShowAsUpgrade = false
            
            if (currentPlan === 'premium' && isCurrentPlanAnnual) {
              // Premium Anual: nenhum plano é upgrade
              shouldShowAsUpgrade = false
            } else if (currentPlan === 'premium' && !isCurrentPlanAnnual) {
              // Premium Mensal: apenas Premium Anual é upgrade
              shouldShowAsUpgrade = plan.id === 'premium' && isPlanAnnual
            } else if (currentPlan === 'pro' && isCurrentPlanAnnual) {
              // Profissional Anual: Premium Anual e Premium Mensal são upgrade
              shouldShowAsUpgrade = plan.id === 'premium'
            } else if (currentPlan === 'pro' && !isCurrentPlanAnnual) {
              // Profissional Mensal: Profissional Anual, Premium Anual, Premium Mensal são upgrade
              shouldShowAsUpgrade = (plan.id === 'pro' && isPlanAnnual) || plan.id === 'premium'
            } else if (currentPlan === 'basico' || !currentPlan) {
              // Básico ou sem plano: todos os planos pagos são upgrade
              shouldShowAsUpgrade = plan.id !== 'basico'
            }
            
            return (
              <Card key={plan.id} className={`flex flex-col relative transition-all duration-300 hover:shadow-lg ${isCurrent ? 'border-2' : plan.recommended ? 'border-primary shadow-lg' : ''} ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`} 
                    style={isCurrent ? { borderColor: 'hsl(142 71% 45%)' } : {}}>
                {/* Badge central - Plano Atual ou Mais Popular */}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap" style={{ backgroundColor: 'hsl(142 71% 45%)' }}>Plano Atual</Badge>
                )}
                {plan.id === 'pro' && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-[10px] px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap"><Star className="h-2.5 w-2.5" />Mais Popular</Badge>
                )}
                {/* Badge direita - Economize (apenas para planos não atuais) */}
                {billingCycle === 'annual' && plan.id !== 'basico' && !isCurrent && (
                  <Badge className="absolute -top-3 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap">Economize 2 meses</Badge>
                )}
                 <CardHeader className="text-center space-y-4">
                  <div className="flex justify-center"><div className="p-3 rounded-full bg-primary/10 text-primary">{plan.icon}</div></div>
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">{plan.period}</span>
                    </div>
                    {billingCycle === 'annual' && plan.annualPrice && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {plan.id === 'pro' ? 'De R$ 358,80 por R$ 299,00 (2 meses grátis)' : 'De R$ 598,80 por R$ 499,00 (2 meses grátis)'}
                      </p>
                    )}
                    {plan.id === 'basico' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Sem cartão de crédito
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0"><Check className="h-4 w-4" style={{ color: 'hsl(142 71% 45%)' }} /></div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    size="lg" 
                    className={`w-full ${shouldShowAsUpgrade ? 'bg-gradient-primary text-white hover:opacity-90' : ''}`}
                    onClick={() => handlePlanClick(plan)}
                    disabled={loading || isCurrent}
                    variant={isCurrent ? "secondary" : !shouldShowAsUpgrade && plan.id !== 'basico' ? "outline" : plan.id === 'basico' ? "outline" : "default"}
                    style={isCurrent ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : isCurrent ? (
                      'Plano Atual'
                    ) : !shouldShowAsUpgrade && plan.id !== 'basico' ? (
                      'Fazer Downgrade'
                    ) : plan.id === 'basico' ? (
                      'Acessar'
                    ) : (
                      'Fazer Upgrade'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">Você pode alterar ou cancelar seu plano a qualquer momento</p>
        </div>
      </div>

      {/* Modal de Upgrade (Proration) */}
      <AlertDialog open={upgradeModal.open} onOpenChange={(open) => setUpgradeModal({ ...upgradeModal, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Upgrade</AlertDialogTitle>
            <AlertDialogDescription>
              {upgradeModal.isLoadingProration ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Calculando valor proporcional...</span>
                </div>
              ) : upgradeModal.prorationData ? (
                <div className="space-y-4 py-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    {/* Planos */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plano atual:</span>
                      <span className="font-medium">{upgradeModal.prorationData.currentPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Novo plano:</span>
                      <span className="font-medium text-primary">{upgradeModal.prorationData.newPlan}</span>
                    </div>
                    <div className="border-t my-2" />
                    
                    {/* Aviso de desconto ativo */}
                    {upgradeModal.prorationData.hasActiveDiscount && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2 mb-2">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          ⚠️ {upgradeModal.prorationData.discountDetails || 'Desconto ativo'} - Crédito não aplicável
                        </p>
                      </div>
                    )}
                    
                    {/* Cálculo de prorrata */}
                    {upgradeModal.prorationData.prorationApplied ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor do plano atual:</span>
                          <span>{upgradeModal.prorationData.currentPlanPriceFormatted}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Dias restantes no ciclo:</span>
                          <span>{upgradeModal.prorationData.daysRemaining} de {upgradeModal.prorationData.totalCycleDays} dias</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Crédito proporcional:</span>
                          <span className="text-green-600 font-medium">-{upgradeModal.prorationData.creditFormatted}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Crédito proporcional:</span>
                        <span className="text-muted-foreground">R$ 0,00</span>
                      </div>
                    )}
                    
                    <div className="border-t my-2" />
                    
                    {/* Novo plano e valor final */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preço do novo plano:</span>
                      <span>{upgradeModal.prorationData.newPlanPriceFormatted}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Valor a pagar agora:</span>
                      <span className="text-primary">{upgradeModal.prorationData.proratedAmountFormatted}</span>
                    </div>
                    
                    {/* Explicação */}
                    <p className="text-xs text-muted-foreground mt-2 bg-background/50 p-2 rounded">
                      {upgradeModal.prorationData.explanation}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600 py-4">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Não foi possível calcular o valor proporcional. Deseja continuar mesmo assim?</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpgrade} disabled={loading || upgradeModal.isLoadingProration}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Upgrade'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Downgrade (Retenção) */}
      <DowngradeRetentionFlow
        open={downgradeModal.open}
        onOpenChange={(open) => setDowngradeModal({ ...downgradeModal, open })}
        currentPlanName={currentPlanInfo?.name || currentPlan}
        targetPlanName={downgradeModal.targetPlan?.name || 'Básico'}
        lostFeatures={getLostFeatures()}
        onConfirmDowngrade={handleConfirmDowngrade}
      />
    </div>
  )
}
