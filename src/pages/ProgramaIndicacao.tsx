import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Gift, Star, Copy, Facebook, Twitter, Linkedin, Instagram, 
  Users, Crown, Briefcase, Circle, LogOut, 
  CheckCircle2, AlertCircle, Loader2, DollarSign, TrendingUp,
  Calendar, CreditCard, Building2, Share2, Settings, Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureGate } from "@/components/FeatureGate";
import { supabase } from "@/integrations/supabase/client";
import AnimatedGiftImage from "@/components/AnimatedGiftImage";
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
  failure_reason?: string | null;
  ineligibility_reason?: string | null;
}

interface CommissionSummary {
  pending: number;
  available: number;
  requested: number;
  paid: number;
  failed: number;
  pendingCount: number;
  availableCount: number;
  requestedCount: number;
  paidCount: number;
  failedCount: number;
}

interface Balances {
  pending: number;
  pending_count: number;
  available: number;
  available_count: number;
  requested: number;
  requested_count: number;
  paid: number;
  paid_count: number;
  failed: number;
  failed_count: number;
}


const ProgramaIndicacao = () => {
  const { user } = useAuth();
  const { hasAccessToFeature } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyHistory[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
  const [balances, setBalances] = useState<Balances>({
    pending: 0, pending_count: 0,
    available: 0, available_count: 0,
    requested: 0, requested_count: 0,
    paid: 0, paid_count: 0,
    failed: 0, failed_count: 0,
  });
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary>({
    pending: 0,
    available: 0,
    requested: 0,
    paid: 0,
    failed: 0,
    pendingCount: 0,
    availableCount: 0,
    requestedCount: 0,
    paidCount: 0,
    failedCount: 0,
  });
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [bankDetailsValidated, setBankDetailsValidated] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');
  const [cooldownEndDate, setCooldownEndDate] = useState<Date | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [payoutMode, setPayoutMode] = useState<'manual' | 'automatic'>('manual');
  const [isSavingPayoutMode, setIsSavingPayoutMode] = useState(false);
  
  const inviteLink = referralCode ? `${window.location.origin}/convite/${referralCode}` : '';

  // Carregar todos os dados
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        // Carregar email do usuário
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          setUserEmail(authUser.email);
        }

        // Carregar status de parceiro, código de indicação, dados bancários e data de saída
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_referral_partner, referral_code, banco, agencia, conta, bank_details_validated, left_referral_program_at, nome, payout_mode')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        setIsEnrolled(profile?.is_referral_partner || false);
        setReferralCode(profile?.referral_code || '');
        const hasBankData = !!(profile?.banco && profile?.agencia && profile?.conta);
        setHasBankDetails(hasBankData);
        setBankDetailsValidated(profile?.bank_details_validated || false);
        setPayoutMode((profile?.payout_mode as 'manual' | 'automatic') || 'manual');

        // Verificar cooldown de 30 dias
        if (profile?.left_referral_program_at && !profile?.is_referral_partner) {
          const leftDate = new Date(profile.left_referral_program_at);
          const cooldownEnd = new Date(leftDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
          if (cooldownEnd > new Date()) {
            setCooldownEndDate(cooldownEnd);
          } else {
            // Cooldown acabou! Verificar se já existe notificação de liberação
            setCooldownEndDate(null);
            
            // Verificar se já existe uma notificação não lida sobre liberação do programa
            const { data: existingNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('lida', false)
              .ilike('titulo', '%reingressar no programa%')
              .single();

            // Se não existe notificação pendente, criar uma nova
            if (!existingNotification) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: user.id,
                  titulo: '🎉 Você pode reingressar no programa de indicação!',
                  conteudo: 'O período de carência de 30 dias terminou. Você pode agora reingressar no Programa de Indicação e começar a ganhar comissões novamente. [REDIRECT:/programa-indicacao]',
                });
            }
            
            // Limpar a data de saída para evitar notificações duplicadas no futuro
            await supabase
              .from('profiles')
              .update({ left_referral_program_at: null })
              .eq('user_id', user.id);
          }
        } else {
          setCooldownEndDate(null);
        }

        if (profile?.is_referral_partner) {
          // Carregar estatísticas
          await loadStats();
          
          // Se o usuário é parceiro mas não tem dados bancários, criar notificação
          // Verificar localStorage para evitar criar notificações repetidas
          if (!hasBankData) {
            const notificationKey = `bank_details_notification_sent_${user.id}`;
            const alreadySent = localStorage.getItem(notificationKey);
            
            if (!alreadySent) {
              // Verificar se já existe qualquer notificação sobre dados bancários (lida ou não)
              const { data: existingNotification } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', user.id)
                .ilike('titulo', '%dados bancários%')
                .limit(1)
                .maybeSingle();

              // Se nunca foi enviada, criar uma nova
              if (!existingNotification) {
                await supabase
                  .from('notifications')
                  .insert({
                    user_id: user.id,
                    titulo: 'Complete seus dados bancários',
                    conteudo: 'Para receber suas comissões do programa de indicação, complete seus dados bancários nas configurações. [REDIRECT:/configuracoes?tab=bank-details]',
                  });
              }
              
              // Marcar como enviada no localStorage para evitar verificações futuras
              localStorage.setItem(notificationKey, 'true');
            }
          } else {
            // Se tem dados bancários, limpar o flag do localStorage
            localStorage.removeItem(`bank_details_notification_sent_${user.id}`);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, searchParams]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('referral-stats');
      if (error) throw error;
      
      if (data?.success) {
        setStats(data.stats);
        setMonthlyHistory(data.monthly_history || []);
        setRecentPayouts(data.recent_payouts || []);
        
        // Usar balances da API (novos campos)
        if (data.balances) {
          setBalances(data.balances);
          setCommissionSummary({
            pending: data.balances.pending || 0,
            available: data.balances.available || 0,
            requested: data.balances.requested || 0,
            paid: data.balances.paid || 0,
            failed: data.balances.failed || 0,
            pendingCount: data.balances.pending_count || 0,
            availableCount: data.balances.available_count || 0,
            requestedCount: data.balances.requested_count || 0,
            paidCount: data.balances.paid_count || 0,
            failedCount: data.balances.failed_count || 0,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleRequestPayout = async () => {
    if (!user || isRequestingPayout) return;
    
    setIsRequestingPayout(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-referral-payout');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'Saque solicitado!',
          description: data.message,
        });
        // Recarregar stats para atualizar saldos
        await loadStats();
      } else {
        throw new Error(data?.error || 'Erro ao solicitar saque');
      }
    } catch (error: any) {
      console.error('Erro ao solicitar saque:', error);
      toast({
        title: 'Erro ao solicitar saque',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const handlePayoutModeChange = async (automatic: boolean) => {
    if (!user || isSavingPayoutMode) return;
    
    const newMode = automatic ? 'automatic' : 'manual';
    setIsSavingPayoutMode(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ payout_mode: newMode })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setPayoutMode(newMode);
      toast({
        title: 'Preferência salva',
        description: automatic 
          ? 'Saques serão processados automaticamente no dia 15 de cada mês quando atingir R$ 50.'
          : 'Você precisará solicitar manualmente seus saques.',
      });
    } catch (error) {
      console.error('Erro ao salvar preferência:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar sua preferência.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPayoutMode(false);
    }
  };

  const handleEnrollment = async () => {
    if (!user) return;

    // Verificar cooldown de 30 dias
    if (cooldownEndDate && cooldownEndDate > new Date()) {
      const daysRemaining = Math.ceil((cooldownEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      toast({
        title: "Período de carência ativo",
        description: `Você poderá reingressar no programa em ${daysRemaining} dia(s).`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Dispara confetes
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb'],
      });

      // Sempre gerar um novo código ao entrar/reentrar no programa
      const { data: newCodeData, error: codeError } = await supabase
        .rpc('generate_unique_referral_code');
      
      if (codeError) throw codeError;
      const newReferralCode = newCodeData as string;

      // Limpar data de saída ao reingressar
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_referral_partner: true,
          referral_code: newReferralCode,
          left_referral_program_at: null
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setIsEnrolled(true);
      setReferralCode(newReferralCode);
      setCooldownEndDate(null);

      // Verificar dados bancários
      const { data: profile } = await supabase
        .from('profiles')
        .select('banco, agencia, conta, chave_pix')
        .eq('user_id', user.id)
        .single();

      const hasBankData = !!(profile?.banco && profile?.agencia && profile?.conta) || !!profile?.chave_pix;
      setHasBankDetails(hasBankData);

      // SEMPRE criar subconta Asaas ao entrar no programa (não depende de dados bancários)
      // Os dados bancários serão validados apenas no momento do payout
      try {
        const { data: asaasResult, error: asaasError } = await supabase.functions.invoke('referral-asaas-onboard');
        if (asaasError) {
          console.error('Erro ao criar subconta Asaas:', asaasError);
          // Não bloquear inscrição se falhar criação da subconta
        } else {
          console.log('Subconta Asaas criada:', asaasResult);
        }
      } catch (asaasErr) {
        console.error('Erro ao criar subconta Asaas:', asaasErr);
      }

      if (!hasBankData) {
        // Criar notificação para preencher dados bancários
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            titulo: 'Complete seus dados bancários',
            conteudo: 'Para receber suas comissões do programa de indicação automaticamente, complete seus dados bancários nas configurações. [REDIRECT:/configuracoes?tab=bank-details]',
          });
        // Não mostrar toast aqui - a notificação já aparecerá via NotificationContext
      }
      // Não mostrar toast - a experiência com confetti e notificação é suficiente

      // Carregar dados
      await loadStats();
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
      // Obter nome do usuário para o email
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('user_id', user.id)
        .single();
      
      const userName = profile?.nome || 'Usuário';

      // 1. Desativar o parceiro, limpar o código e registrar data de saída para cooldown
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_referral_partner: false,
          referral_code: null, // Invalida o link de convite
          left_referral_program_at: new Date().toISOString() // Registrar data de saída para cooldown
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;

      // 2. Cancelar todas as comissões pendentes (conforme regras do programa)
      // Comissões já pagas não são afetadas
      const { data: cancelledPayouts, error: payoutsError } = await supabase
        .from('referral_payouts')
        .update({ 
          status: 'cancelled',
          failure_reason: 'Usuário deixou o programa de indicação'
        })
        .eq('referrer_user_id', user.id)
        .eq('status', 'pending')
        .select('id');
      
      if (payoutsError) {
        console.error('Erro ao cancelar comissões pendentes:', payoutsError);
      }

      const pendingCommissionsCancelled = (cancelledPayouts?.length || 0) > 0;

      // 3. Marcar referrals existentes como inativos (o parceiro não receberá mais comissões)
      // Os descontos dos indicados continuam válidos (status não é alterado para 'expired')
      const { error: referralsError } = await supabase
        .from('referrals')
        .update({ status: 'partner_left' })
        .eq('referrer_user_id', user.id)
        .in('status', ['active', 'pending']);
      
      if (referralsError) {
        console.error('Erro ao atualizar referrals:', referralsError);
      }

      // 4. Enviar email de confirmação de saída
      try {
        await supabase.functions.invoke('send-referral-exit-email', {
          body: {
            userId: user.id,
            userName,
            userEmail,
            pendingCommissionsCancelled,
            totalReferrals: stats?.total_referrals || 0
          }
        });
        console.log('Email de saída enviado com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email de saída:', emailError);
        // Não bloquear a saída se o email falhar
      }
      
      // 5. Limpar estado local completamente
      setIsEnrolled(false);
      setReferralCode('');
      setStats(null);
      setMonthlyHistory([]);
      setRecentPayouts([]);
      
      // Calcular data de fim do cooldown
      const cooldownEnd = new Date();
      cooldownEnd.setDate(cooldownEnd.getDate() + 30);
      setCooldownEndDate(cooldownEnd);
      
      toast({
        title: "Você deixou o programa",
        description: "Seu link foi desativado e comissões pendentes foram canceladas. Um email de confirmação foi enviado.",
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
        return <Badge variant="secondary">Pendente (15 dias)</Badge>;
      case 'available':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Disponível</Badge>;
      case 'requested':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Saque Solicitado</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelado</Badge>;
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

  // Feature Gate - block entire page for basic plan
  if (!hasAccessToFeature('referral_program')) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Programa de Indicação</h1>
              <p className="text-muted-foreground">Indique amigos e ganhe recompensas</p>
            </div>
          </div>
          
          <FeatureGate feature="referral_program" showLocked={true}>
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Programa de Indicação
                </CardTitle>
                <CardDescription>
                  Ganhe comissões indicando colegas para a plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {['Indicações', 'Comissões', 'Pendentes', 'Total'].map((item) => (
                    <Card key={item} className="p-4">
                      <div className="h-4 bg-muted rounded w-24 mb-2" />
                      <div className="h-6 bg-muted rounded w-16" />
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FeatureGate>
        </div>
      </Layout>
    )
  }

  if (!isEnrolled) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Programa de Indicação</h1>
              <p className="text-muted-foreground">Indique amigos e ganhe recompensas</p>
            </div>
          </div>

          {/* Aviso de Cooldown - Banner compacto */}
          {cooldownEndDate && cooldownEndDate > new Date() && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Período de carência ativo.</strong> Você poderá reingressar no programa em{' '}
                <strong>
                  {cooldownEndDate.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </strong>.
              </p>
            </div>
          )}

          {/* Banner Principal */}
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
              
              {/* Flowing Aurora Lines - organic water-like waves - HIDDEN ON MOBILE for performance */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                <svg 
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Gradients - very transparent on left, visible on right */}
                    <linearGradient id="auroraLine1" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(210, 80%, 55%)" stopOpacity="0.02" />
                      <stop offset="40%" stopColor="hsl(200, 90%, 60%)" stopOpacity="0.03" />
                      <stop offset="70%" stopColor="hsl(195, 85%, 65%)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="hsl(190, 80%, 70%)" stopOpacity="0.45" />
                    </linearGradient>
                    <linearGradient id="auroraLine2" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(215, 85%, 60%)" stopOpacity="0.02" />
                      <stop offset="35%" stopColor="hsl(205, 90%, 65%)" stopOpacity="0.04" />
                      <stop offset="65%" stopColor="hsl(200, 85%, 70%)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="hsl(195, 80%, 75%)" stopOpacity="0.5" />
                    </linearGradient>
                    <linearGradient id="auroraLine3" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(220, 75%, 58%)" stopOpacity="0.01" />
                      <stop offset="45%" stopColor="hsl(210, 80%, 62%)" stopOpacity="0.03" />
                      <stop offset="75%" stopColor="hsl(205, 75%, 68%)" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="hsl(200, 70%, 72%)" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  
                  {/* Reduced to 6 lines for better performance while maintaining visual effect */}
                  <path 
                    d="M-10,130 C0,50 20,180 40,30 C60,-80 80,120 100,-30 C120,-100 135,20 160,-20" 
                    fill="none" 
                    stroke="url(#auroraLine1)" 
                    strokeWidth="0.35"
                    className="aurora-wave aurora-1"
                  />
                  <path 
                    d="M-8,120 C5,40 25,170 45,50 C65,-40 85,140 105,60 C125,0 140,100 165,115" 
                    fill="none" 
                    stroke="url(#auroraLine2)" 
                    strokeWidth="0.4"
                    className="aurora-wave aurora-2"
                  />
                  <path 
                    d="M-5,140 C10,60 30,190 50,40 C70,-70 90,130 110,-20 C130,-90 150,30 175,-25" 
                    fill="none" 
                    stroke="url(#auroraLine3)" 
                    strokeWidth="0.28"
                    className="aurora-wave aurora-3"
                  />
                  <path 
                    d="M-12,115 C2,35 22,160 42,45 C62,-50 82,135 102,55 C122,-10 140,90 168,120" 
                    fill="none" 
                    stroke="url(#auroraLine1)" 
                    strokeWidth="0.38"
                    className="aurora-wave aurora-4"
                  />
                  <path 
                    d="M-6,125 C8,45 28,175 48,35 C68,-75 88,125 108,-15 C128,-85 148,25 170,-10" 
                    fill="none" 
                    stroke="url(#auroraLine2)" 
                    strokeWidth="0.3"
                    className="aurora-wave aurora-5"
                  />
                  <path 
                    d="M-15,110 C0,30 20,155 40,40 C60,-55 80,130 100,50 C120,-5 138,95 165,110" 
                    fill="none" 
                    stroke="url(#auroraLine3)" 
                    strokeWidth="0.35"
                    className="aurora-wave aurora-6"
                  />
                </svg>
              </div>
              
              {/* Mobile-optimized simple gradient overlay */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none md:hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
              </div>
              
              <style>{`
                @keyframes auroraFlow {
                  0%, 100% {
                    stroke-dashoffset: 250;
                    opacity: 0.5;
                  }
                  50% {
                    stroke-dashoffset: 0;
                    opacity: 0.9;
                  }
                }
                .aurora-wave {
                  stroke-dasharray: 250;
                  animation: auroraFlow 6s ease-in-out infinite;
                }
                .aurora-1 { animation-delay: 0s; animation-duration: 7s; }
                .aurora-2 { animation-delay: 0.6s; animation-duration: 8s; }
                .aurora-3 { animation-delay: 1.2s; animation-duration: 6.5s; }
                .aurora-4 { animation-delay: 1.8s; animation-duration: 7.5s; }
                .aurora-5 { animation-delay: 0.3s; animation-duration: 6.8s; }
                .aurora-6 { animation-delay: 0.9s; animation-duration: 7.2s; }
              `}</style>
              
              <CardContent className="relative p-8 overflow-hidden">
                {/* Imagem do presente - posicionada absolutamente à direita */}
                <div className="absolute right-16 top-[70%] -translate-y-1/2 w-80 h-80 pointer-events-none hidden lg:block">
                  <AnimatedGiftImage />
                </div>
                
                <div className="flex-1 space-y-6 relative z-10 lg:pr-64">
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
                    disabled={!!(cooldownEndDate && cooldownEndDate > new Date())}
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    {cooldownEndDate && cooldownEndDate > new Date() 
                      ? 'Aguardando período de carência' 
                      : 'Ingressar no Programa de Indicação'}
                  </Button>
                  
                  <p className="text-sm text-muted-foreground">
                    Ao ingressar, você aceita nossos{" "}
                    <Link to="/termos-indicacao" className="text-primary underline cursor-pointer hover:text-primary/80 transition-colors">
                      termos e condições
                    </Link>{" "}
                    do programa de indicação.
                  </p>
                </div>
                
                {/* Versão mobile - abaixo do conteúdo */}
                <div className="w-full h-48 relative mt-6 lg:hidden overflow-hidden">
                  <AnimatedGiftImage />
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
            onClick={() => setShowLeaveConfirmation(true)}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Deixar Programa
          </Button>
        </div>

        {/* Modal de confirmação para sair do programa */}
        <AlertDialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Deixar o Programa de Indicação?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 pt-2">
                <p>
                  <strong>Atenção:</strong> Ao deixar o programa, seu perfil de indicação será <strong>completamente resetado</strong>.
                </p>
                <p>
                  Você perderá:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Todas as indicações registradas</li>
                  <li>Todos os pagamentos pendentes referentes às indicações</li>
                  <li>Histórico de comissões</li>
                  <li>Seu link de indicação atual</li>
                </ul>
                <p className="text-sm font-medium text-destructive">
                  Esta ação não pode ser desfeita.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveProgram}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Saída
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alertas de configuração */}
        {!hasBankDetails && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate md:whitespace-normal">
                  Complete seus dados bancários para receber comissões.
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/configuracoes?tab=bank-details')}
                className="flex-shrink-0 whitespace-nowrap"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Configurar
              </Button>
            </div>
          </Alert>
        )}

        {hasBankDetails && !bankDetailsValidated && (
          <Alert className="border-orange-500/50 bg-orange-500/10 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate md:whitespace-normal">
                  Seus dados bancários precisam ser validados para receber pagamentos.
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/configuracoes?tab=bank-details')}
                className="flex-shrink-0 whitespace-nowrap"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Validar Dados
              </Button>
            </div>
          </Alert>
        )}

        {hasBankDetails && bankDetailsValidated && (
          <Alert className="border-green-500/50 bg-green-500/10 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate md:whitespace-normal">
                  Seus dados bancários estão validados! Pagamentos serão processados automaticamente via PIX.
                </span>
              </div>
            </div>
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
              <Button onClick={() => setShareModalOpen(true)} size="sm" className="shrink-0 bg-gradient-primary hover:opacity-90">
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
                  <p className="text-sm text-muted-foreground">Profissional</p>
                  <p className="text-2xl font-bold">{stats?.pro_referrals || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-500" />
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
        </div>

        {/* Resumo de Saldos - Novo layout SaaS */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Seus Saldos
                </CardTitle>
                <CardDescription className="mt-1">
                  Pagamentos ficam disponíveis para saque após 15 dias da confirmação, por segurança e prevenção a fraudes.
                </CardDescription>
              </div>
              {/* Botão Solicitar Saque - só aparece no modo manual */}
              {payoutMode === 'manual' && balances.available >= 5000 && bankDetailsValidated && (
                <Button 
                  onClick={handleRequestPayout}
                  disabled={isRequestingPayout}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isRequestingPayout ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Solicitar Saque
                </Button>
              )}
              {/* Badge de modo automático */}
              {payoutMode === 'automatic' && bankDetailsValidated && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Saque automático ativo
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Saldo Pendente */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pendente</p>
                  <Badge variant="secondary">{commissionSummary.pendingCount}</Badge>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  {formatCurrency(commissionSummary.pending)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Em validação (aguardando 15 dias)
                </p>
              </div>
              
              {/* Saldo Disponível */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-primary">Disponível</p>
                  <Badge className="bg-primary/20 text-primary">{commissionSummary.availableCount}</Badge>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(commissionSummary.available)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {balances.available >= 5000 ? 'Pronto para sacar!' : 'Mínimo R$ 50 para saque'}
                </p>
              </div>
              
              {/* Total Sacado */}
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Sacado</p>
                  <Badge className="bg-green-500/20 text-green-600">{commissionSummary.paidCount}</Badge>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(commissionSummary.paid)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total já recebido
                </p>
              </div>
            </div>
            
            {/* Linha adicional: Solicitado/Processando e Falhas */}
            {(commissionSummary.requested > 0 || commissionSummary.failed > 0) && (
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                {commissionSummary.requested > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Em Processamento</p>
                        <p className="text-lg font-bold text-blue-500">{formatCurrency(commissionSummary.requested)}</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-600">{commissionSummary.requestedCount}</Badge>
                    </div>
                  </div>
                )}
                {commissionSummary.failed > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Falhas/Canceladas</p>
                        <p className="text-lg font-bold text-red-500">{formatCurrency(commissionSummary.failed)}</p>
                      </div>
                      <Badge variant="destructive">{commissionSummary.failedCount}</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Alerta se saldo disponível mas sem dados bancários */}
            {balances.available >= 5000 && !bankDetailsValidated && (
              <Alert className="mt-4 border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription>
                  Você tem saldo disponível para saque! Complete e valide seus dados bancários para solicitar.
                </AlertDescription>
              </Alert>
            )}

            {/* Configuração de Modo de Saque */}
            <Separator className="my-4" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="payout-mode" className="text-base font-medium">
                    Modo de Saque
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {payoutMode === 'automatic' 
                      ? 'Saques automáticos no dia 15 de cada mês quando atingir R$ 50.'
                      : 'Você solicita o saque manualmente quando quiser.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${payoutMode === 'manual' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Manual
                </span>
                <Switch
                  id="payout-mode"
                  checked={payoutMode === 'automatic'}
                  onCheckedChange={handlePayoutModeChange}
                  disabled={isSavingPayoutMode || !bankDetailsValidated}
                />
                <span className={`text-sm ${payoutMode === 'automatic' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Automático
                </span>
              </div>
            </div>
            {!bankDetailsValidated && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Valide seus dados bancários para alterar o modo de saque.
              </p>
            )}
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
                    className={`p-4 rounded-lg border ${
                      payout.status === 'cancelled' || payout.status === 'failed' 
                        ? 'border-red-500/30 bg-red-500/5' 
                        : payout.status === 'pending'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
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
                    
                    {/* Mostrar motivos de não elegibilidade ou falha */}
                    {(payout.failure_reason || payout.ineligibility_reason) && (
                      <div className="mt-3 pt-3 border-t border-red-500/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            {payout.failure_reason && (
                              <p className="text-red-600">
                                <strong>Motivo:</strong> {payout.failure_reason}
                              </p>
                            )}
                            {payout.ineligibility_reason && (
                              <p className="text-orange-600">
                                <strong>Inelegibilidade:</strong> {payout.ineligibility_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
