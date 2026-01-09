import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, CheckCircle, Users, Star, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Mapeamento de profissões sem acento para com acento
const PROFESSION_MAP: Record<string, string> = {
  'psicologo': 'Psicólogo',
  'psicologa': 'Psicóloga',
  'psiquiatra': 'Psiquiatra',
  'terapeuta': 'Terapeuta',
  'nutricionista': 'Nutricionista',
  'fisioterapeuta': 'Fisioterapeuta',
  'fonoaudiologo': 'Fonoaudiólogo',
  'fonoaudiologa': 'Fonoaudióloga',
  'medico': 'Médico',
  'medica': 'Médica',
  'enfermeiro': 'Enfermeiro',
  'enfermeira': 'Enfermeira',
  'coach': 'Coach',
  'pedagogo': 'Pedagogo',
  'pedagoga': 'Pedagoga',
  'psicopedagogo': 'Psicopedagogo',
  'psicopedagoga': 'Psicopedagoga',
};

interface ReferrerInfo {
  nome: string;
  profissao: string | null;
  avatar_url: string | null;
}

const ConviteIndicacao = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
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

        // Use secure RPC function to get referrer info (doesn't require auth)
        const { data: referrerData, error } = await supabase
          .rpc('get_referrer_public_info', { referral_code: code });

        if (error) {
          console.error('Error fetching referrer:', error);
          setLoading(false);
          return;
        }

        console.log('[ConviteIndicacao] Referrer data:', referrerData);

        // The RPC now returns an array of rows
        const referrerArray = referrerData as Array<{ nome: string; profissao: string | null; avatar_url: string | null; user_id: string }>;
        const referrer = referrerArray && referrerArray.length > 0 ? referrerArray[0] : null;

        if (referrer && referrer.nome) {
          // Get signed URL for avatar using the public edge function
          if (referrer.avatar_url) {
            try {
              const { data: avatarData, error: avatarError } = await supabase.functions.invoke('get-public-avatar', {
                body: { avatar_path: referrer.avatar_url }
              });
              
              if (!avatarError && avatarData?.signedUrl) {
                setAvatarSignedUrl(avatarData.signedUrl);
              }
            } catch (avatarFetchError) {
              console.error('[ConviteIndicacao] Error fetching avatar:', avatarFetchError);
            }
          }
          
          setReferrerInfo({
            nome: referrer.nome,
            profissao: referrer.profissao || null,
            avatar_url: referrer.avatar_url || null
          });
          setIsValidCode(true);
        } else {
          // Link expirado ou indicador saiu do programa
          setIsValidCode(false);
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

  // Format profession with proper accents
  const formatProfession = (profissao: string | null) => {
    if (!profissao) return null;
    const normalized = profissao.toLowerCase().trim();
    if (PROFESSION_MAP[normalized]) {
      return PROFESSION_MAP[normalized];
    }
    return profissao.charAt(0).toUpperCase() + profissao.slice(1);
  };

  // Get initials for avatar fallback
  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Light theme styles (inline to guarantee they apply)
  const lightThemeStyles = {
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={lightThemeStyles}>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
        <Card className="w-full max-w-lg relative z-10" style={{ backgroundColor: '#ffffff' }}>
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

  // Link inválido ou expirado
  if (!isValidCode) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={lightThemeStyles}>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
        <Card className="w-full max-w-lg border-orange-200 shadow-xl relative z-10" style={{ backgroundColor: '#ffffff' }}>
          <CardHeader className="text-center pb-2">
            <div className="relative mx-auto mb-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
              Link Inválido ou Expirado
            </CardTitle>
            
            <CardDescription className="text-base mt-2" style={{ color: '#6b7280' }}>
              Este link de convite não é mais válido. O indicador pode ter saído do programa ou o link expirou.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            <Button 
              onClick={() => navigate('/signup')}
              size="lg"
              className="w-full text-base font-semibold h-12 shadow-lg hover:shadow-xl transition-all"
            >
              Criar conta sem desconto
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              Você ainda pode criar sua conta normalmente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={lightThemeStyles}>
      {/* Blue blob background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }} />
      <div className="w-full max-w-lg space-y-6 relative z-10 animate-fade-in">
        {/* Main Card */}
        <Card className="border-2 shadow-xl animate-scale-in" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <CardHeader className="text-center pb-2">
            {/* Avatar do profissional */}
            {referrerInfo && (
              <div className="relative mx-auto mb-4">
                <div className="h-20 w-20 rounded-full ring-4 ring-blue-100 shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  {avatarSignedUrl ? (
                    <img 
                      src={avatarSignedUrl} 
                      alt={referrerInfo.nome}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {getInitials(referrerInfo.nome)}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-white">
                  <Gift className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )}
            
            <CardTitle className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
              Você foi convidado!
            </CardTitle>
            
            {referrerInfo && (
              <CardDescription className="text-base mt-2" style={{ color: '#6b7280' }}>
                <span className="font-semibold" style={{ color: '#1a1a1a' }}>{referrerInfo.nome}</span>
                {referrerInfo.profissao && (
                  <span style={{ color: '#6b7280' }}> ({formatProfession(referrerInfo.profissao)})</span>
                )}
                <br />
                <span style={{ color: '#6b7280' }}>te convidou para conhecer o TherapyPro</span>
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            {/* Discount Banner - Automatic Discount Notice */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
              <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-bold text-lg">20% OFF Automático!</span>
              </div>
              
              <p className="text-sm text-green-600 text-center">
                Ao fazer upgrade para o <strong>Plano Profissional</strong>, seu desconto de 20% será aplicado automaticamente no primeiro mês.
              </p>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge className="bg-green-500 text-white border-0 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Desconto garantido
                </Badge>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center" style={{ color: '#6b7280' }}>
                O que você terá acesso:
              </p>
              <div className="grid gap-3">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: '#f9fafb' }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {benefit.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#1a1a1a' }}>{benefit.title}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{benefit.description}</p>
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

            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              Ao criar sua conta, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 animate-fade-in" style={{ animationDelay: '0.2s', color: '#6b7280' }}>
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
