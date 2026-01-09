import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Loader2, AlertTriangle } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
}

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

export const UpgradeModal = ({ open, onOpenChange, feature }: UpgradeModalProps) => {
  const { currentPlan } = useSubscription()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [prorationView, setProrationView] = useState<{
    show: boolean
    plan: typeof plans[0] | null
    data: ProrationData | null
    isLoading: boolean
    error: string | null
  }>({ show: false, plan: null, data: null, isLoading: false, error: null })

  const plans = [
    {
      name: 'Pro',
      id: 'pro',
      price: 'R$ 29,90',
      period: '/mês',
      features: [
        'Até 20 clientes',
        'Sessões ilimitadas',
        'Histórico básico',
        'Suporte por email'
      ],
      recommended: currentPlan === 'basico',
      stripePrice: 'price_1SSMNgCP57sNVd3laEmlQOcb'
    },
    {
      name: 'Premium',
      id: 'premium',
      price: 'R$ 59,90',
      period: '/mês',
      features: [
        'Clientes ilimitados',
        'Sessões ilimitadas',
        'Histórico completo',
        'Relatórios em PDF',
        'Integração WhatsApp',
        'Suporte prioritário'
      ],
      recommended: currentPlan === 'pro',
      stripePrice: 'price_1SSMOBCP57sNVd3lqjfLY6Du'
    }
  ]

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
      // SEMPRE usar Stripe para checkout de assinatura
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: plan.stripePrice, 
          returnUrl: window.location.origin
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
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
        toast.info(`Você será redirecionado para pagar o valor proporcional de ${data.proratedAmountFormatted}`)
        window.location.href = data.paymentUrl
      } else {
        // Upgrade completed without additional payment
        toast.success(data?.message || 'Upgrade realizado com sucesso!')
        sessionStorage.setItem('show_upgrade_welcome', data.newPlan)
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
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plano atual:</span>
                  <span className="font-medium">{prorationView.data.currentPlan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Novo plano:</span>
                  <span className="font-medium text-primary">{prorationView.data.newPlan}</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Crédito do plano atual:</span>
                  <span className="text-green-600">-{prorationView.data.creditFormatted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Preço do novo plano:</span>
                  <span>{prorationView.data.newPlanPriceFormatted}</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Valor a pagar agora:</span>
                  <span className="text-primary">{prorationView.data.proratedAmountFormatted}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você tem {prorationView.data.daysRemaining} dias restantes no período atual (até {prorationView.data.periodEndDate})
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upgrade Necessário</DialogTitle>
        </DialogHeader>
        
        <div className="text-center mb-6">
          <p className="text-muted-foreground">
            Para usar <span className="font-semibold">{feature}</span>, você precisa fazer upgrade do seu plano.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.recommended ? 'border-primary shadow-lg' : ''}`}>
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Recomendado
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feat, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-sm">{feat}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plan.recommended ? "default" : "outline"}
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
