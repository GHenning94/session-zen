import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
}

export const UpgradeModal = ({ open, onOpenChange, feature }: UpgradeModalProps) => {
  const { currentPlan } = useSubscription()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const plans = [
    {
      name: 'Pro',
      price: 'R$ 29,90',
      period: '/mês',
      features: [
        'Até 20 clientes',
        'Sessões ilimitadas',
        'Histórico básico',
        'Suporte por email'
      ],
      recommended: currentPlan === 'basico',
      stripePrice: 'price_1RowvqFeTymAqTGEU6jkKtXi' // ID do Profissional
    },
    {
      name: 'Premium',
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
      stripePrice: 'price_1RoxpDFeTymAqTGEWg0sS49i' // ID do Premium
    }
  ]

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripePrice }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plan.recommended ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
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