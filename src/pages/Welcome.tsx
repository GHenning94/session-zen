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
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  // Verificar se usuário está autenticado
  useEffect(() => {
    console.log('[Welcome] Verificando autenticação...', { hasUser: !!user })
    
    if (!user) {
      console.warn('[Welcome] Nenhum usuário encontrado. Redirecionando para /login em 3s...')
      toast({
        title: 'Sessão inválida',
        description: 'Faça login para acessar esta página.',
        variant: 'destructive'
      })
      
      const timer = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 3000)
      
      return () => clearTimeout(timer)
    }
    
    console.log('[Welcome] ✅ Usuário autenticado:', user.id)
    setIsCheckingUser(false)
  }, [user, navigate])

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
      stripeMonthlyId: 'price_1SSMNgCP57sNVd3laEmlQOcb',  // ✅ ATUALIZADO
      stripeAnnualId: 'price_1SSMOdCP57sNVd3la4kMOinN',   // ✅ ATUALIZADO
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
      stripeMonthlyId: 'price_1SSMOBCP57sNVd3lqjfLY6Du',  // ✅ ATUALIZADO
      stripeAnnualId: 'price_1SSMP7CP57sNVd3lSf4oYINX',   // ✅ ATUALIZADO
      highlight: false
    }
  ];

  const handleSelectPlan = async (planId: string) => {
    if (loading) return;
    
    setLoading(planId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para selecionar um plano',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }

      // Se for plano básico, atualiza o perfil e marca onboarding como completo
      if (planId === 'basico') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_plan: 'basico',
            first_login_completed: true,
            onboarding_completed: true
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Erro ao atualizar perfil:', updateError);
          throw new Error('Erro ao ativar plano básico');
        }

        toast({
          title: 'Bem-vindo ao TherapyPro!',
          description: 'Plano Básico ativado com sucesso!',
        });
        
        sessionStorage.removeItem('pending_plan');
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }

      // Para planos pagos, obter o priceId correto
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        toast({
          title: 'Erro',
          description: 'Plano não encontrado',
          variant: 'destructive'
        });
        setLoading(null);
        return;
      }

      const priceId = isAnnual ? plan.stripeAnnualId : plan.stripeMonthlyId;
      
      if (!priceId) {
        toast({
          title: 'Erro',
          description: 'Configuração de preço inválida. Entre em contato com o suporte.',
          variant: 'destructive'
        });
        setLoading(null);
        return;
      }

      console.log('Criando checkout para:', { planId, priceId, isAnnual });

      // Criar sessão de checkout no Stripe
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId,
          returnUrl: window.location.origin 
        }
      });

      if (error) {
        console.error('Erro na Edge Function create-checkout:', error);
        throw new Error(error.message || 'Erro ao criar sessão de pagamento');
      }
      
      if (!data?.url) {
        throw new Error('URL de checkout não retornada. Tente novamente.');
      }

      // Redirecionar para o Stripe
      sessionStorage.removeItem('pending_plan');
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Erro ao selecionar plano:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar plano';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      setLoading(null);
    }
  };

  // Mostrar loading enquanto verifica usuário
  if (isCheckingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

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