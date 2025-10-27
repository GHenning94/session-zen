import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [preselectedPlan, setPreselectedPlan] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se há um plano pré-selecionado
    const pendingPlan = sessionStorage.getItem('pending_plan');
    if (pendingPlan) {
      setPreselectedPlan(pendingPlan);
    }
  }, []);

  const plans = [
    {
      id: 'basico',
      name: 'Básico',
      icon: Sparkles,
      description: 'Para começar sua jornada',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        'Até 3 clientes',
        'Até 4 sessões por cliente',
        'Agenda básica',
        'Suporte por email'
      ],
      stripeMonthlyId: null,
      stripeAnnualId: null,
      highlight: false
    },
    {
      id: 'pro',
      name: 'Profissional',
      icon: Zap,
      description: 'Para profissionais em crescimento',
      monthlyPrice: 29.90,
      annualPrice: 299.90,
      features: [
        'Até 20 clientes',
        'Sessões ilimitadas',
        'Histórico completo',
        'Personalização de design',
        'Relatórios básicos',
        'Suporte prioritário'
      ],
      stripeMonthlyId: 'price_1QqLiLBJC6TkeQebbJQiW8P0',
      stripeAnnualId: 'price_1QqLjCBJC6TkeQebB0OjVdWp',
      highlight: true
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Crown,
      description: 'Recursos completos e avançados',
      monthlyPrice: 49.90,
      annualPrice: 499.90,
      features: [
        'Clientes ilimitados',
        'Sessões ilimitadas',
        'Histórico completo',
        'Relatórios PDF avançados',
        'Integração WhatsApp',
        'Personalização total',
        'Configurações avançadas',
        'Suporte VIP 24/7'
      ],
      stripeMonthlyId: 'price_1QqLkKBJC6TkeQebMaD5OlnU',
      stripeAnnualId: 'price_1QqLlBBJC6TkeQebfWe0pPFy',
      highlight: false
    }
  ];

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para selecionar um plano',
        variant: 'destructive'
      });
      return;
    }

    setLoading(planId);

    try {
      // Se for plano básico, apenas marca como concluído
      if (planId === 'basico') {
        const { error } = await supabase
          .from('profiles')
          .update({ first_login_completed: true })
          .eq('user_id', user.id);

        if (error) throw error;

        // Limpar sessionStorage
        sessionStorage.removeItem('pending_plan');

        toast({
          title: 'Bem-vindo ao TherapyPro!',
          description: 'Você está usando o plano Básico. Você pode fazer upgrade a qualquer momento.',
        });

        navigate('/dashboard');
        return;
      }

      // Para planos pagos, criar checkout no Stripe
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plano não encontrado');

      const priceId = isAnnual ? plan.stripeAnnualId : plan.stripeMonthlyId;
      if (!priceId) throw new Error('Price ID não encontrado');

      // IMPORTANTE: Marcar first_login_completed ANTES de ir para o Stripe
      // para evitar loop de redirecionamento quando voltar
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_login_completed: true })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Erro ao atualizar profile:', profileError);
        throw profileError;
      }

      const returnUrl = `${window.location.origin}/dashboard?payment=success`;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, returnUrl }
      });

      if (error) throw error;

      if (data?.url) {
        // Limpar sessionStorage antes de redirecionar
        sessionStorage.removeItem('pending_plan');
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('Erro ao selecionar plano:', error);
      
      // Melhor mensagem para erro de Price ID
      let errorMessage = error.message || 'Tente novamente mais tarde';
      if (errorMessage.includes('No such price') || errorMessage.includes('price_')) {
        errorMessage = 'Erro na configuração de pagamento. Por favor, entre em contato com o suporte.';
      }
      
      toast({
        title: 'Erro ao processar plano',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Bem-vindo ao TherapyPro! 🎉</h1>
          <p className="text-muted-foreground text-lg">
            Escolha o plano ideal para começar sua jornada
          </p>
        </div>

        {/* Toggle Mensal/Anual */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : ''}>
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : ''}>
            Anual
            <span className="ml-2 text-primary text-sm">(Economize até 17%)</span>
          </Label>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPreselected = preselectedPlan === plan.id;
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const priceDisplay = price === 0 
              ? 'Grátis' 
              : `R$ ${price.toFixed(2)}/${isAnnual ? 'ano' : 'mês'}`;

            return (
              <Card
                key={plan.id}
                className={`relative transition-all hover:shadow-lg ${
                  plan.highlight ? 'border-primary border-2 scale-105' : ''
                } ${isPreselected ? 'ring-4 ring-primary' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                {isPreselected && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                      Pré-selecionado
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{priceDisplay}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading !== null}
                    variant={plan.highlight ? 'default' : 'outline'}
                  >
                    {loading === plan.id ? 'Processando...' : 'Escolher Plano'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Você pode alterar ou cancelar seu plano a qualquer momento
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
