import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, Loader2, AlertTriangle, Star } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
  premiumOnly?: boolean
}

interface ProrationData {
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
  isDowngrade: boolean
  explanation: string
  // Novas propriedades para desconto
  prorationApplied: boolean
  noProrationReason: string | null
  hasActiveDiscount: boolean
  discountType: string | null
  discountDetails: string | null
}

const STRIPE_PRICES = {
  pro: {
    monthly: 'price_1SSMNgCP57sNVd3laEmlQOcb',
    yearly: 'price_1SSMOdCP57sNVd3la4kMOinN'
  },
  premium: {
    monthly: 'price_1SSMOBCP57sNVd3lqjfLY6Du',
    yearly: 'price_1SSMP7CP57sNVd3lSf4oYINX'
  }
}

export const UpgradeModal = ({ open, onOpenChange, feature, premiumOnly = false }: UpgradeModalProps) => {
  const { currentPlan } = useSubscription()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [prorationView, setProrationView] = useState<{
    show: boolean
    plan: typeof allPlans[0] | null
    data: ProrationData | null
    isLoading: boolean
    error: string | null
  }>({ show: false, plan: null, data: null, isLoading: false, error: null })

  const allPlans = [
    {
      name: 'Profissional',
      id: 'pro',
      monthlyPrice: 'R$ 29,90',
      yearlyPrice: 'R$ 299,00',
      yearlyMonthlyEquivalent: 'R$ 24,92',
      period: billingInterval === 'monthly' ? '/mês' : '/ano',
      features: [
        'Dashboard completo',
        'Até 50 pacientes',
        'Sessões ilimitadas',
        'Sessões recorrentes e pacotes',
        'Metas e relatórios simples',
        'Página pública padrão',
        'Programa de indicação'
      ],
      recommended: true,
      stripePrice: billingInterval === 'monthly' 
        ? STRIPE_PRICES.pro.monthly 
        : STRIPE_PRICES.pro.yearly
    },
    {
      name: 'Premium',
      id: 'premium',
      monthlyPrice: 'R$ 49,90',
      yearlyPrice: 'R$ 499,00',
      yearlyMonthlyEquivalent: 'R$ 41,58',
      period: billingInterval === 'monthly' ? '/mês' : '/ano',
      features: [
        'Tudo do Profissional',
        'Pacientes ilimitados',
        'Relatórios avançados (PDF, Excel, filtros)',
        'Integração Google Agenda',
        'Integração WhatsApp',
        'Personalização total (tema + cores)',
        'Suporte prioritário'
      ],
      recommended: false,
      stripePrice: billingInterval === 'monthly' 
        ? STRIPE_PRICES.premium.monthly 
        : STRIPE_PRICES.premium.yearly
    }
  ]
  
  // Filter plans based on premiumOnly prop
  const plans = premiumOnly 
    ? allPlans.filter(plan => plan.id === 'premium')
    : allPlans

  const handlePlanSelect = async (plan: typeof plans[0]) => {
    if (!user) return;
    
    // If user already has a paid plan, show proration preview first
    if (currentPlan !== 'basico') {
      setProrationView({
        show: true,
        plan,
        data: null,
        isLoading: true,
        error: null
      })

      try {
        // SEMPRE usar Stripe para proration
        const { data, error } = await supabase.functions.invoke('preview-proration', {
          body: { 
            newPriceId: plan.stripePrice,
            planId: plan.id 
          }
        })

        if (error) throw error

        console.log('[UpgradeModal] ✅ Proration data received:', data)
        setProrationView(prev => ({
          ...prev,
          data,
          isLoading: false
        }))
      } catch (error: any) {
        console.error('[UpgradeModal] ❌ Error fetching proration:', error)
        setProrationView(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Erro ao calcular valor proporcional'
        }))
      }
      return
    }

    // For free plan users, go directly to Stripe checkout
    await processCheckout(plan)
  }

  /**
   * Processa checkout - SEMPRE via Stripe
   * Desconto de indicação é aplicado via cupom Stripe
   * Comissões são calculadas no webhook Stripe e pagas via Asaas (payout)
   */
  const processCheckout = async (plan: typeof plans[0]) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // ✅ Salvar o plano pendente ANTES de ir para o Stripe
      sessionStorage.setItem('pending_tier_upgrade', plan.id);
      console.log('[UpgradeModal] 📝 Saved pending_tier_upgrade:', plan.id);
      
      // SEMPRE usar Stripe para checkout de assinatura
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: plan.stripePrice, 
          returnUrl: window.location.origin
        }
      });

      if (error) throw error;

      if (data?.url) {
        // ✅ Marcar que está indo para checkout externo (Stripe)
        sessionStorage.setItem('stripe_checkout_active', 'true');
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      // Limpar pending se falhar
      sessionStorage.removeItem('pending_tier_upgrade');
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const handleConfirmUpgrade = async () => {
    if (!prorationView.plan || !user) return

    setLoading(true)
    try {
      // SEMPRE usar Stripe para upgrade
      console.log('[UpgradeModal] 🚀 Processing upgrade via Stripe')
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { 
          newPriceId: prorationView.plan.stripePrice,
          planId: prorationView.plan.id
        }
      })

      if (error) throw error

      if (data?.requiresPayment && data?.paymentUrl) {
        // Store for welcome modal after payment
        sessionStorage.setItem('pending_tier_upgrade', data.newPlan)
        localStorage.setItem('pending_tier_upgrade', data.newPlan) // ✅ Também no localStorage
        // ✅ Salvar plano anterior para calcular features desbloqueadas
        localStorage.setItem('pending_previous_plan', currentPlan)
        // ✅ Marcar que está indo para checkout externo (Stripe)
        sessionStorage.setItem('stripe_checkout_active', 'true')
        localStorage.setItem('stripe_checkout_active', 'true') // ✅ Também no localStorage
        toast.info(`Você será redirecionado para pagar o valor proporcional de ${data.proratedAmountFormatted}`)
        window.location.href = data.paymentUrl
      } else {
        // Upgrade completed without additional payment
        toast.success(data?.message || 'Upgrade realizado com sucesso!')
        // ✅ Salvar em AMBOS os storages para garantir que o modal apareça
        localStorage.setItem('show_upgrade_welcome', data.newPlan)
        sessionStorage.setItem('show_upgrade_welcome', data.newPlan)
        // ✅ Salvar features desbloqueadas antes de navegar
        if (user?.id && currentPlan !== data.newPlan) {
          const FEATURE_TO_PLAN: Record<string, string> = {
            whatsapp_notifications: 'premium',
            google_calendar: 'premium',
            reports: 'pro',
            advanced_reports: 'premium',
            report_filters: 'premium',
            referral_program: 'pro',
            referral_history: 'premium',
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
            packages_sidebar: 'pro',
            recurring_sessions: 'pro',
            recurring_sessions_sidebar: 'pro',
            reports_sidebar: 'pro',
            referral_program_sidebar: 'pro',
            google_calendar_sidebar: 'premium', // Badge na sidebar (Integrações)
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
            console.log('[UpgradeModal] 🎯 Saved unlocked features:', updated)
          }
          
          localStorage.setItem(`last_known_plan_${user.id}`, data.newPlan)
        }
        onOpenChange(false)
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      console.error('[UpgradeModal] ❌ Error processing upgrade:', err)
      toast.error(`Erro ao processar upgrade: ${err.message || 'Tente novamente.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPlans = () => {
    setProrationView({ show: false, plan: null, data: null, isLoading: false, error: null })
  }

  // Proration confirmation view
  if (prorationView.show) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleBackToPlans()
        }
        onOpenChange(isOpen)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Upgrade</DialogTitle>
          </DialogHeader>

          {prorationView.isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Calculando valor proporcional...</p>
            </div>
          ) : prorationView.error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-destructive text-center">{prorationView.error}</p>
              <Button variant="outline" onClick={handleBackToPlans}>
                Voltar
              </Button>
            </div>
          ) : prorationView.data ? (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                {/* Planos */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plano atual:</span>
                  <span className="font-medium">{prorationView.data.currentPlan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Novo plano:</span>
                  <span className="font-medium text-primary">{prorationView.data.newPlan}</span>
                </div>
                
                <div className="border-t border-border my-2" />
                
                {/* Aviso de desconto ativo (se houver) */}
                {prorationView.data.hasActiveDiscount && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      ⚠️ {prorationView.data.discountDetails || 'Desconto ativo detectado'} - Crédito não aplicável
                    </p>
                  </div>
                )}
                
                {/* Cálculo de prorrata */}
                {prorationView.data.prorationApplied ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor do plano atual:</span>
                      <span>{prorationView.data.currentPlanPriceFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Dias restantes no ciclo:</span>
                      <span>{prorationView.data.daysRemaining} de {prorationView.data.totalCycleDays} dias</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Crédito proporcional:</span>
                      <span className="text-green-600 font-medium">-{prorationView.data.creditFormatted}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Crédito proporcional:</span>
                    <span className="text-muted-foreground">R$ 0,00</span>
                  </div>
                )}
                
                <div className="border-t border-border my-2" />
                
                {/* Novo plano e valor final */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Preço do novo plano:</span>
                  <span>{prorationView.data.newPlanPriceFormatted}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Valor a pagar agora:</span>
                  <span className="text-primary">{prorationView.data.proratedAmountFormatted}</span>
                </div>
                
                {/* Explicação */}
                <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
                  {prorationView.data.explanation}
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleBackToPlans}
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleConfirmUpgrade}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Upgrade'
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    )
  }

  // Default plan selection view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", premiumOnly ? "max-w-lg" : "max-w-4xl")}>
        <DialogHeader>
          <DialogTitle>Upgrade Necessário</DialogTitle>
        </DialogHeader>
        
        <div className="text-center mb-4">
          <p className="text-muted-foreground">
            Para usar <span className="font-semibold">{feature}</span>, você precisa fazer upgrade do seu plano.
          </p>
        </div>

        {/* Billing interval toggle - padronizado com Upgrade.tsx */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-sm ${billingInterval === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Mensal</span>
          {isMobile ? (
            <Switch
              checked={billingInterval === 'yearly'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            />
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={billingInterval === 'yearly'}
              onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform" style={{ transform: billingInterval === 'yearly' ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          )}
          <span className={`text-sm ${billingInterval === 'yearly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Anual</span>
          {billingInterval === 'yearly' && (
            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
              Economize 2 meses
            </Badge>
          )}
        </div>

        <div className={cn("grid gap-8", premiumOnly ? "grid-cols-1" : "md:grid-cols-2")}>
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "relative transition-all duration-300",
                premiumOnly 
                  ? 'border-2 border-primary shadow-lg'
                  : plan.id === 'pro' ? 'border-2 border-primary shadow-lg' : 'border border-border'
              )}
            >
              {/* Badge Mais Popular - only show when showing all plans */}
              {!premiumOnly && plan.id === 'pro' && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 flex items-center gap-1 whitespace-nowrap">
                  <Star className="h-3 w-3" />
                  Mais Popular
                </Badge>
              )}
              
              {/* Badge Economize 2 meses para plano anual */}
              {billingInterval === 'yearly' && (
                <Badge className="absolute -top-3 right-4 bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                  Economize 2 meses
                </Badge>
              )}
              
              <CardHeader className="text-center pt-6">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="mt-2">
                  <span className="text-3xl font-bold text-foreground">
                    {billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                  {billingInterval === 'yearly' && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {plan.id === 'pro' ? 'De R$ 358,80 por R$ 299,00 (2 meses grátis)' : 'De R$ 598,80 por R$ 499,00 (2 meses grátis)'}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feat, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feat}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plan.id === 'pro' ? "default" : "outline"}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading}
                >
                  {loading ? 'Processando...' : `Escolher ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-center mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Talvez mais tarde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}