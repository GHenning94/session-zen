import { TrendingUp, Users, DollarSign, Package, Target } from "lucide-react"
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline"
import { formatCurrencyBR } from "@/utils/formatters"

interface BusinessOrbitalViewProps {
  dashboardData: {
    sessionsToday: number
    activeClients: number
    monthlyRevenue: number
    pendingRevenue: number
    completionRate: number
  }
  packageStats: {
    activePackages: number
    totalRevenue: number
  }
  upcomingSessionsCount: number
}

export const BusinessOrbitalView = ({ 
  dashboardData, 
  packageStats,
  upcomingSessionsCount 
}: BusinessOrbitalViewProps) => {
  
  const now = new Date()
  const currentMonth = now.toLocaleDateString('pt-BR', { month: 'short' })
  const currentDay = now.getDate()
  
  // Calcular progresso baseado nos dados reais
  const sessionsProgress = Math.min(100, (dashboardData.sessionsToday / 8) * 100) // Assumindo 8 sessões/dia como ideal
  const clientsProgress = Math.min(100, (dashboardData.activeClients / 50) * 100) // Assumindo 50 clientes como meta
  const revenueProgress = Math.min(100, (dashboardData.monthlyRevenue / 10000) * 100) // Meta de R$ 10k
  const packagesProgress = Math.min(100, (packageStats.activePackages / 10) * 100) // Meta de 10 pacotes
  const completionProgress = dashboardData.completionRate
  
  const timelineData = [
    {
      id: 1,
      title: "Sessões Hoje",
      date: `${currentDay} ${currentMonth}`,
      content: `${dashboardData.sessionsToday} sessão${dashboardData.sessionsToday !== 1 ? 'ões' : ''} realizada${dashboardData.sessionsToday !== 1 ? 's' : ''} hoje. ${upcomingSessionsCount} agendada${upcomingSessionsCount !== 1 ? 's' : ''} nos próximos dias.`,
      category: "Atendimentos",
      icon: TrendingUp,
      relatedIds: [2, 5],
      status: sessionsProgress >= 75 ? "completed" as const : sessionsProgress >= 30 ? "in-progress" as const : "pending" as const,
      energy: Math.round(sessionsProgress),
    },
    {
      id: 2,
      title: "Clientes Ativos",
      date: currentMonth,
      content: `${dashboardData.activeClients} cliente${dashboardData.activeClients !== 1 ? 's' : ''} ativo${dashboardData.activeClients !== 1 ? 's' : ''} na sua carteira. Base sólida para crescimento sustentável.`,
      category: "Crescimento",
      icon: Users,
      relatedIds: [1, 3],
      status: clientsProgress >= 60 ? "completed" as const : "in-progress" as const,
      energy: Math.round(clientsProgress),
    },
    {
      id: 3,
      title: "Receita Mensal",
      date: currentMonth,
      content: `${formatCurrencyBR(dashboardData.monthlyRevenue)} recebidos este mês. ${formatCurrencyBR(dashboardData.pendingRevenue)} pendentes.`,
      category: "Financeiro",
      icon: DollarSign,
      relatedIds: [2, 4],
      status: revenueProgress >= 70 ? "completed" as const : "in-progress" as const,
      energy: Math.round(revenueProgress),
    },
    {
      id: 4,
      title: "Pacotes Ativos",
      date: currentMonth,
      content: `${packageStats.activePackages} pacote${packageStats.activePackages !== 1 ? 's' : ''} de sessões em andamento. Receita total: ${formatCurrencyBR(packageStats.totalRevenue)}.`,
      category: "Produtos",
      icon: Package,
      relatedIds: [3, 5],
      status: packagesProgress >= 50 ? "completed" as const : "in-progress" as const,
      energy: Math.round(packagesProgress),
    },
    {
      id: 5,
      title: "Meta do Mês",
      date: currentMonth,
      content: `Performance geral: ${dashboardData.completionRate}%. Continue mantendo a consistência nos atendimentos.`,
      category: "Objetivos",
      icon: Target,
      relatedIds: [1, 4],
      status: completionProgress >= 90 ? "completed" as const : completionProgress >= 70 ? "in-progress" as const : "pending" as const,
      energy: Math.round(completionProgress),
    },
  ]

  return (
    <div className="relative">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Visão Geral do Negócio</h3>
        <p className="text-sm text-muted-foreground">Clique nos nós orbitais para ver detalhes</p>
      </div>
      <RadialOrbitalTimeline timelineData={timelineData} />
    </div>
  )
}
