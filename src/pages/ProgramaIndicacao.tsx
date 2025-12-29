import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Gift, Star, Copy, Facebook, Twitter, Linkedin, Instagram, 
  Users, Crown, Briefcase, Circle, LogOut, ExternalLink, 
  CheckCircle2, AlertCircle, Loader2, DollarSign, TrendingUp,
  Calendar, CreditCard, Building2, ArrowRight, Share2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AnimatedGiftBox from "@/components/AnimatedGiftBox";
import ShareReferralModal from "@/components/ShareReferralModal";
import confetti from "canvas-confetti";
interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  pending_referrals: number;
  premium_referrals: number;
  pro_referrals: number;
  basic_referrals: number;
  total_earned: number;
  pending_earnings: number;
}

interface MonthlyHistory {
  month: string;
  amount: number;
  count: number;
}

interface RecentPayout {
  id: string;
  amount: number;
  status: string;
  referred_user_name: string;
  referred_plan: string;
  paid_at: string | null;
  created_at: string;
}

interface ConnectStatus {
  has_account: boolean;
  account_status: string | null;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

const ProgramaIndicacao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyHistory[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [isSettingUpConnect, setIsSettingUpConnect] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  const referralCode = `REF-${user?.id?.slice(0, 8).toUpperCase() || 'DEFAULT'}`;
  const inviteLink = `${window.location.origin}/convite/${referralCode}`;

  // Carregar todos os dados
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        // Carregar status de parceiro e dados bancários
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_referral_partner, banco, agencia, conta')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        setIsEnrolled(profile?.is_referral_partner || false);
        setHasBankDetails(!!(profile?.banco && profile?.agencia && profile?.conta));

        if (profile?.is_referral_partner) {
          // Carregar estatísticas
          await loadStats();
          // Verificar status do Stripe Connect
          await loadConnectStatus();
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Verificar se voltou do onboarding do Stripe
    if (searchParams.get('refresh') === 'true') {
      loadConnectStatus();
    }
  }, [user, searchParams]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('referral-stats');
      if (error) throw error;
      
      if (data?.success) {
        setStats(data.stats);
        setMonthlyHistory(data.monthly_history || []);
        setRecentPayouts(data.recent_payouts || []);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('referral-connect-status');
      if (error) throw error;
      setConnectStatus(data);
    } catch (error) {
      console.error('Erro ao verificar status do Connect:', error);
    }
  };

  const handleEnrollment = async () => {
    if (!user) return;
    
    try {
      // Dispara confetes
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb'],
      });

      const { error } = await supabase
        .from('profiles')
        .update({ is_referral_partner: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setIsEnrolled(true);

      // Verificar dados bancários
      const { data: profile } = await supabase
        .from('profiles')
        .select('banco, agencia, conta')
        .eq('user_id', user.id)
        .single();

      const hasBankData = !!(profile?.banco && profile?.agencia && profile?.conta);
      setHasBankDetails(hasBankData);

      if (!hasBankData) {
        // Criar notificação para preencher dados bancários
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            titulo: 'Complete seus dados bancários',
            conteudo: 'Para receber suas comissões do programa de indicação, complete seus dados bancários nas configurações. [REDIRECT:/configuracoes?tab=financeiro]',
          });

        toast({
          title: "Parabéns!",
          description: "Você foi inscrito no programa. Complete seus dados bancários para receber comissões.",
        });
      } else {
        toast({
          title: "Parabéns!",
          description: "Você foi inscrito no programa de indicação com sucesso.",
        });
      }

      // Carregar dados
      await loadStats();
      await loadConnectStatus();
    } catch (error) {
      console.error('Erro ao ingressar no programa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ingressar no programa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveProgram = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_referral_partner: false })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setIsEnrolled(false);
      toast({
        title: "Você deixou o programa",
        description: "Você pode ingressar novamente a qualquer momento.",
      });
    } catch (error) {
      console.error('Erro ao sair do programa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível sair do programa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSetupConnect = async () => {
    setIsSettingUpConnect(true);
    try {
      const { data, error } = await supabase.functions.invoke('referral-connect-onboard', {
        body: {
          return_url: `${window.location.origin}/programa-indicacao`,
          refresh_url: `${window.location.origin}/programa-indicacao?refresh=true`,
        }
      });

      if (error) throw error;

      if (data?.onboarding_url) {
        window.location.href = data.onboarding_url;
      }
    } catch (error) {
      console.error('Erro ao configurar Stripe Connect:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a configuração. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSettingUpConnect(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    });
  };

  const shareOnSocial = (platform: string) => {
    const text = "Descubra o TherapyPro - Sistema completo de gestão para profissionais da saúde!";
    const url = inviteLink;
    
    let shareUrl = "";
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'instagram':
        copyLink();
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const formatCurrency = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isEnrolled) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Programa de Indicação</h1>
              <p className="text-muted-foreground">Indique amigos e ganhe recompensas</p>
            </div>
          </div>

          {/* Banner Principal */}
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
              
              {/* Flowing Wave Lines - Aurora effect from bottom region spreading upward */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg 
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Gradients with transparency in the middle */}
                    <linearGradient id="auroraLine1" x1="50%" y1="100%" x2="80%" y2="0%">
                      <stop offset="0%" stopColor="hsl(210, 100%, 55%)" stopOpacity="0.5" />
                      <stop offset="40%" stopColor="hsl(200, 100%, 60%)" stopOpacity="0.1" />
                      <stop offset="70%" stopColor="hsl(190, 100%, 70%)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="hsl(185, 100%, 75%)" stopOpacity="0.15" />
                    </linearGradient>
                    <linearGradient id="auroraLine2" x1="50%" y1="100%" x2="90%" y2="0%">
                      <stop offset="0%" stopColor="hsl(215, 100%, 60%)" stopOpacity="0.45" />
                      <stop offset="35%" stopColor="hsl(205, 100%, 65%)" stopOpacity="0.08" />
                      <stop offset="65%" stopColor="hsl(195, 100%, 70%)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="hsl(190, 100%, 75%)" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="auroraLine3" x1="45%" y1="100%" x2="100%" y2="20%">
                      <stop offset="0%" stopColor="hsl(220, 90%, 65%)" stopOpacity="0.4" />
                      <stop offset="45%" stopColor="hsl(210, 90%, 70%)" stopOpacity="0.05" />
                      <stop offset="80%" stopColor="hsl(200, 90%, 75%)" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="hsl(195, 90%, 80%)" stopOpacity="0.08" />
                    </linearGradient>
                    <linearGradient id="auroraLine4" x1="55%" y1="100%" x2="75%" y2="0%">
                      <stop offset="0%" stopColor="hsl(205, 100%, 55%)" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="hsl(195, 100%, 60%)" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="hsl(185, 100%, 70%)" stopOpacity="0.22" />
                    </linearGradient>
                  </defs>
                  
                  {/* Line 1 - goes high to top-right */}
                  <path 
                    d="M45,105 C48,80 55,55 65,35 Q75,15 90,8" 
                    fill="none" 
                    stroke="url(#auroraLine1)" 
                    strokeWidth="0.4"
                    className="aurora-wave aurora-1"
                  />
                  
                  {/* Line 2 - curves to mid-right */}
                  <path 
                    d="M50,105 C55,85 62,65 72,50 Q82,35 95,32" 
                    fill="none" 
                    stroke="url(#auroraLine2)" 
                    strokeWidth="0.5"
                    className="aurora-wave aurora-2"
                  />
                  
                  {/* Line 3 - gentle curve to upper-mid */}
                  <path 
                    d="M48,105 C52,78 60,52 70,38 Q80,24 92,18" 
                    fill="none" 
                    stroke="url(#auroraLine3)" 
                    strokeWidth="0.35"
                    className="aurora-wave aurora-3"
                  />
                  
                  {/* Line 4 - ends mid-height right */}
                  <path 
                    d="M52,105 C58,88 68,72 78,58 Q88,44 98,42" 
                    fill="none" 
                    stroke="url(#auroraLine4)" 
                    strokeWidth="0.45"
                    className="aurora-wave aurora-4"
                  />
                  
                  {/* Line 5 - spreads wide to bottom-right area */}
                  <path 
                    d="M55,105 C62,92 72,80 82,70 Q92,60 100,58" 
                    fill="none" 
                    stroke="url(#auroraLine1)" 
                    strokeWidth="0.38"
                    className="aurora-wave aurora-5"
                  />
                  
                  {/* Line 6 - higher trajectory */}
                  <path 
                    d="M47,105 C50,72 58,42 68,25 Q78,8 88,5" 
                    fill="none" 
                    stroke="url(#auroraLine2)" 
                    strokeWidth="0.42"
                    className="aurora-wave aurora-6"
                  />
                  
                  {/* Line 7 - mid curve */}
                  <path 
                    d="M53,105 C60,82 70,60 80,45 Q90,30 100,25" 
                    fill="none" 
                    stroke="url(#auroraLine3)" 
                    strokeWidth="0.3"
                    className="aurora-wave aurora-7"
                  />
                  
                  {/* Line 8 - lower spread */}
                  <path 
                    d="M58,105 C65,95 78,85 88,78 Q98,71 100,70" 
                    fill="none" 
                    stroke="url(#auroraLine4)" 
                    strokeWidth="0.35"
                    className="aurora-wave aurora-8"
                  />
                </svg>
              </div>
              
              <style>{`
                @keyframes auroraFlow {
                  0%, 100% {
                    stroke-dashoffset: 200;
                    opacity: 0.6;
                  }
                  50% {
                    stroke-dashoffset: 0;
                    opacity: 1;
                  }
                }
                .aurora-wave {
                  stroke-dasharray: 200;
                  animation: auroraFlow 6s ease-in-out infinite;
                }
                .aurora-1 { animation-delay: 0s; animation-duration: 5s; }
                .aurora-2 { animation-delay: 0.8s; animation-duration: 6s; }
                .aurora-3 { animation-delay: 1.6s; animation-duration: 5.5s; }
                .aurora-4 { animation-delay: 2.4s; animation-duration: 6.5s; }
                .aurora-5 { animation-delay: 0.4s; animation-duration: 5.8s; }
                .aurora-6 { animation-delay: 1.2s; animation-duration: 6.2s; }
                .aurora-7 { animation-delay: 2s; animation-duration: 5.3s; }
                .aurora-8 { animation-delay: 2.8s; animation-duration: 6.8s; }
              `}</style>
              
              <CardContent className="relative p-8">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-1 space-y-6 relative z-10">
                    <div className="space-y-4">
                      <h2 className="text-3xl font-bold">Ganhe até 30% de Comissão</h2>
                      <p className="text-lg text-muted-foreground">
                        Convide seus colegas profissionais e ganhe comissões recorrentes!<br />
                        Planos mensais: 30% no 1º mês e 15% nos seguintes. Planos anuais: 20%.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleEnrollment}
                      size="lg" 
                      className="w-full sm:w-auto"
                    >
                      <Gift className="w-5 h-5 mr-2" />
                      Ingressar no Programa de Indicação
                    </Button>
                    
                    <p className="text-sm text-muted-foreground">
                      Ao ingressar, você aceita nossos{" "}
                      <Link to="/termos-indicacao" className="text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                        termos e condições
                      </Link>{" "}
                      do programa de indicação.
                    </p>
                  </div>
                  
                  <div className="w-full lg:w-auto flex justify-center relative z-0">
                    <AnimatedGiftBox />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Como Funciona */}
          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
              <CardDescription>Siga esses passos simples para começar a ganhar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold">Inscreva-se</h3>
                    <p className="text-sm text-muted-foreground">
                      Clique no botão acima e ingresse no programa
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold">Compartilhe</h3>
                    <p className="text-sm text-muted-foreground">
                      Use seu link único para convidar colegas profissionais
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold">Ganhe Recompensas</h3>
                    <p className="text-sm text-muted-foreground">
                      Receba até 30% de comissão por cada assinatura
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefícios */}
          <Card>
            <CardHeader>
              <CardTitle>Benefícios do Programa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Mensal: 30% no 1º mês, 15% nos seguintes</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Pagamentos automáticos via Stripe</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Anual: 20% de comissão recorrente</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Dashboard completo de acompanhamento</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Programa de Indicação</h1>
              <p className="text-muted-foreground">Painel do programa de indicações</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLeaveProgram}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Deixar Programa
          </Button>
        </div>

        {/* Alertas de configuração */}
        {!hasBankDetails && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="flex items-center justify-between">
              <span>Complete seus dados bancários para receber comissões.</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/configuracoes?tab=bank-details')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Configurar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {connectStatus && !connectStatus.has_account && hasBankDetails && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <AlertDescription className="flex items-center justify-between">
              <span>Configure sua conta de pagamento para receber comissões automaticamente.</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSetupConnect}
                disabled={isSettingUpConnect}
              >
                {isSettingUpConnect ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Configurar Stripe
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {connectStatus?.has_account && !connectStatus.payouts_enabled && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="flex items-center justify-between">
              <span>Sua conta Stripe precisa de informações adicionais para habilitar pagamentos.</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSetupConnect}
                disabled={isSettingUpConnect}
              >
                {isSettingUpConnect ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Completar cadastro
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {connectStatus?.payouts_enabled && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Sua conta está configurada! Pagamentos serão processados automaticamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Link de Indicação */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Seu Link de Indicação</CardTitle>
                <CardDescription>
                  Ganhe <span className="text-primary font-semibold">30% no 1º mês</span> (mensal) ou <span className="text-primary font-semibold">20%</span> (anual)
                </CardDescription>
              </div>
              <Button onClick={() => setShareModalOpen(true)} className="shrink-0">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={inviteLink} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button onClick={copyLink} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Botões de Redes Sociais */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Compartilhar nas redes sociais:</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => shareOnSocial('facebook')}
                  variant="outline"
                  size="sm"
                  className="text-primary"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={() => shareOnSocial('twitter')}
                  variant="outline"
                  size="sm"
                  className="text-sky-500"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  onClick={() => shareOnSocial('linkedin')}
                  variant="outline"
                  size="sm"
                  className="text-blue-700"
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </Button>
                <Button
                  onClick={() => shareOnSocial('instagram')}
                  variant="outline"
                  size="sm"
                  className="text-pink-600"
                >
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Modal */}
        <ShareReferralModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          referralLink={inviteLink}
          referralCode={referralCode}
        />

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Indicados</p>
                  <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{stats?.active_referrals || 0}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Básico</p>
                  <p className="text-2xl font-bold">{stats?.basic_referrals || 0}</p>
                </div>
                <Circle className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Premium</p>
                  <p className="text-2xl font-bold">{stats?.premium_referrals || 0}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profissional</p>
                  <p className="text-2xl font-bold">{stats?.pro_referrals || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo de Ganhos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Resumo de Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-3xl font-bold text-green-500">
                  {formatCurrency(stats?.total_earned || 0)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-3xl font-bold text-yellow-500">
                  {formatCurrency(stats?.pending_earnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico Mensal */}
        {monthlyHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Histórico Mensal
              </CardTitle>
              <CardDescription>Ganhos dos últimos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyHistory.map((item) => (
                  <div key={item.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{formatMonth(item.month)}</span>
                      <Badge variant="secondary">{item.count} pagamento(s)</Badge>
                    </div>
                    <span className="font-bold text-green-500">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico de Pagamentos Detalhado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Histórico de Comissões
            </CardTitle>
            <CardDescription>Detalhes de cada comissão recebida ou pendente</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma comissão registrada ainda.</p>
                <p className="text-sm">Compartilhe seu link e comece a ganhar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayouts.map((payout) => (
                  <div 
                    key={payout.id} 
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{payout.referred_user_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {payout.referred_plan === 'premium' ? 'Premium' : 'Profissional'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payout.paid_at 
                          ? `Pago em ${new Date(payout.paid_at).toLocaleDateString('pt-BR')}`
                          : `Criado em ${new Date(payout.created_at).toLocaleDateString('pt-BR')}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatCurrency(payout.amount)}</span>
                      {getStatusBadge(payout.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link para termos */}
        <div className="text-center pt-4">
          <Button 
            variant="link" 
            className="text-muted-foreground"
            onClick={() => navigate('/termos-indicacao')}
          >
            Ver Termos e Condições do Programa de Indicação
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ProgramaIndicacao;
