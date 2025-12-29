import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, CheckCircle, Users, Star, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PREDEFINED_PROFESSIONS = [
  "Psicólogo(a)",
  "Psicanalista", 
  "Terapeuta",
  "Coach"
];

interface ReferrerInfo {
  nome: string;
  profissao: string | null;
  avatar_url: string | null;
}

const ConviteIndicacao = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);

  useEffect(() => {
    const validateAndFetchReferrer = async () => {
      if (!code) {
        setLoading(false);
        return;
      }

      try {
        // Store the referral code in localStorage for later use during checkout
        localStorage.setItem('referral_code', code);

        // The referral code format is: REF-{userId.slice(0,8).toUpperCase()}
        // Extract the user ID part
        const userIdPart = code.replace('REF-', '').toLowerCase();
        
        // Try to find the user by matching the beginning of their user_id
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('nome, profissao, avatar_url, user_id')
          .eq('is_referral_partner', true);

        if (error) {
          console.error('Error fetching referrer:', error);
          setLoading(false);
          return;
        }

        // Find the profile that matches the referral code
        const referrer = profiles?.find(profile => 
          profile.user_id.slice(0, 8).toLowerCase() === userIdPart
        );

        if (referrer) {
          setReferrerInfo({
            nome: referrer.nome,
            profissao: referrer.profissao,
            avatar_url: referrer.avatar_url
          });
          setIsValidCode(true);
        }
      } catch (error) {
        console.error('Error validating referral code:', error);
      } finally {
        setLoading(false);
      }
    };

    validateAndFetchReferrer();
  }, [code]);

  const handleSignup = () => {
    // The referral code is already stored in localStorage
    navigate('/signup');
  };

  const benefits = [
    {
      icon: <CheckCircle className="h-5 w-5 text-primary" />,
      title: 'Gestão completa de clientes',
      description: 'Organize todos os seus pacientes em um só lugar'
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: 'Agenda inteligente',
      description: 'Controle de sessões e agendamentos automáticos'
    },
    {
      icon: <Star className="h-5 w-5 text-primary" />,
      title: 'Prontuários digitais',
      description: 'Documentação segura e organizada'
    },
    {
      icon: <Gift className="h-5 w-5 text-primary" />,
      title: 'Relatórios financeiros',
      description: 'Controle total das suas finanças'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Main Card */}
        <Card className="border-2 border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="relative mx-auto mb-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Gift className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold">
              Você foi convidado!
            </CardTitle>
            
            {isValidCode && referrerInfo ? (
              <CardDescription className="text-base mt-2">
                <span className="font-semibold text-foreground">{referrerInfo.nome}</span>
                {referrerInfo.profissao && (
                  <span className="text-muted-foreground"> ({referrerInfo.profissao})</span>
                )}
                <br />
                <span className="text-muted-foreground">te convidou para conhecer o Meu Consultório</span>
              </CardDescription>
            ) : (
              <CardDescription className="text-base mt-2">
                Você recebeu um convite especial para conhecer o Meu Consultório
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            {/* Benefits */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground text-center">
                O que você terá acesso:
              </p>
              <div className="grid gap-3">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {benefit.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={handleSignup}
              size="lg"
              className="w-full text-base font-semibold h-12 shadow-lg hover:shadow-xl transition-all"
            >
              Criar minha conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao criar sua conta, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>100% Seguro</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>Sem cartão</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConviteIndicacao;
