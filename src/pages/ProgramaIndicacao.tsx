import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, Copy, Facebook, Twitter, Linkedin, Instagram, Users, Crown, Briefcase, Circle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import referralGift from "@/assets/referral-gift.jpg";

const ProgramaIndicacao = () => {
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const inviteLink = `https://therapypro.app/convite/${user?.id || 'default'}`;

  const handleEnrollment = () => {
    setIsEnrolled(true);
    toast({
      title: "Parabéns!",
      description: "Você foi inscrito no programa de indicação com sucesso.",
    });
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
        // Instagram não permite compartilhamento direto via URL, então apenas copiamos o link
        copyLink();
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const stats = {
    activeUsers: 156,
    premiumUsers: 45,
    professionalUsers: 23,
    basicUsers: 88,
    totalEarned: "R$ 2.340,00"
  };

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
              <CardContent className="relative p-8">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="space-y-4">
                      <h2 className="text-3xl font-bold">Ganhe com Indicações</h2>
                      <p className="text-lg text-muted-foreground">
                        Convide seus colegas profissionais e ganhe recompensas por cada assinatura realizada através do seu link.
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
                      <span className="text-primary underline cursor-pointer">
                        termos e condições
                      </span>{" "}
                      do programa de indicação.
                    </p>
                  </div>
                  
                  <div className="w-full lg:w-auto flex justify-center">
                    <img 
                      src={referralGift} 
                      alt="Programa de Indicação" 
                      className="w-64 h-32 object-cover rounded-lg shadow-lg"
                    />
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
                      Receba comissões por cada assinatura realizada
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
                  <span>Comissão de 30% por cada indicação</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Pagamentos mensais automáticos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Material promocional gratuito</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Suporte dedicado para parceiros</span>
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
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Programa de Indicação</h1>
            <p className="text-muted-foreground">Painel do programa de indicações</p>
          </div>
        </div>

        {/* Link de Indicação */}
        <Card>
          <CardHeader>
            <CardTitle>Seu Link de Indicação</CardTitle>
            <CardDescription>
              Compartilhe este link para ganhar comissões por cada nova assinatura
            </CardDescription>
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
                  className="text-blue-600"
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

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Premium</p>
                  <p className="text-2xl font-bold">{stats.premiumUsers}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Profissionais</p>
                  <p className="text-2xl font-bold">{stats.professionalUsers}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Básicos</p>
                  <p className="text-2xl font-bold">{stats.basicUsers}</p>
                </div>
                <Circle className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Ganhos */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Valores Recebidos</CardTitle>
            <CardDescription>Acompanhe seus ganhos com o programa de indicação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'hsl(142 71% 45% / 0.1)' }}>
                <div>
                  <p className="font-semibold text-lg">Total Recebido</p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(142 71% 45%)' }}>{stats.totalEarned}</p>
                </div>
                <Badge variant="secondary" style={{ backgroundColor: 'hsl(142 71% 45% / 0.1)', color: 'hsl(142 71% 45%)' }}>
                  ↗ +15% este mês
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Janeiro 2024</span>
                  <span className="font-semibold">R$ 450,00</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Dezembro 2023</span>
                  <span className="font-semibold">R$ 780,00</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Novembro 2023</span>
                  <span className="font-semibold">R$ 320,00</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Outubro 2023</span>
                  <span className="font-semibold">R$ 790,00</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProgramaIndicacao;