import { Calendar, Users, DollarSign, Package, BadgeDollarSign } from "lucide-react"
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline"
import { formatCurrencyBR } from "@/utils/formatters"
import { Card } from "@/components/ui/card"

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
      title: "Sessões",
      date: `${currentDay} ${currentMonth}`,
      content: `${dashboardData.sessionsToday} sessão${dashboardData.sessionsToday !== 1 ? 'ões' : ''} realizada${dashboardData.sessionsToday !== 1 ? 's' : ''} hoje. ${upcomingSessionsCount} agendada${upcomingSessionsCount !== 1 ? 's' : ''} nos próximos dias.`,
      category: "Atendimentos",
      icon: Calendar,
      relatedIds: [],
      status: sessionsProgress >= 75 ? "completed" as const : sessionsProgress >= 30 ? "in-progress" as const : "pending" as const,
      energy: Math.round(sessionsProgress),
    },
    {
      id: 2,
      title: "Clientes",
      date: currentMonth,
      content: `${dashboardData.activeClients} cliente${dashboardData.activeClients !== 1 ? 's' : ''} ativo${dashboardData.activeClients !== 1 ? 's' : ''} na sua carteira. Base sólida para crescimento sustentável.`,
      category: "Crescimento",
      icon: Users,
      relatedIds: [],
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
      relatedIds: [],
      status: revenueProgress >= 70 ? "completed" as const : "in-progress" as const,
      energy: Math.round(revenueProgress),
    },
    {
      id: 4,
      title: "Pacotes",
      date: currentMonth,
      content: `${packageStats.activePackages} pacote${packageStats.activePackages !== 1 ? 's' : ''} de sessões em andamento. Receita total: ${formatCurrencyBR(packageStats.totalRevenue)}.`,
      category: "Produtos",
      icon: Package,
      relatedIds: [],
      status: packagesProgress >= 50 ? "completed" as const : "in-progress" as const,
      energy: Math.round(packagesProgress),
    },
    {
      id: 5,
      title: "Ticket Médio",
      date: currentMonth,
      content: `Performance geral: ${dashboardData.completionRate}%. Continue mantendo a consistência nos atendimentos.`,
      category: "Objetivos",
      icon: BadgeDollarSign,
      relatedIds: [],
      status: completionProgress >= 90 ? "completed" as const : completionProgress >= 70 ? "in-progress" as const : "pending" as const,
      energy: Math.round(completionProgress),
    },
  ]

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Progresso de Metas</h2>
      <RadialOrbitalTimeline timelineData={timelineData} />
    </Card>
  )
}
