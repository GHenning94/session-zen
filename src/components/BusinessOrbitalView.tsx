import { Calendar, Users, DollarSign, Package, BadgeDollarSign } from "lucide-react"
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline"
import { formatCurrencyBR } from "@/utils/formatters"
import { Card } from "@/components/ui/card"
import { useMetas } from "@/hooks/useMetas"
import { useEffect } from "react"

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
  const { metas, getMetaAtivaPorTipo, verificarEMarcarMetasConcluidas } = useMetas()
  
  const now = new Date()
  const currentMonth = now.toLocaleDateString('pt-BR', { month: 'short' })
  const currentDay = now.getDate()
  
  // Verificar e marcar metas concluídas automaticamente
  useEffect(() => {
    verificarEMarcarMetasConcluidas(
      dashboardData.sessionsToday,
      dashboardData.activeClients,
      dashboardData.monthlyRevenue,
      packageStats.activePackages,
      dashboardData.completionRate
    )
  }, [dashboardData, packageStats])
  
  // Pegar metas ativas
  const metaSessoes = getMetaAtivaPorTipo('sessoes')
  const metaClientes = getMetaAtivaPorTipo('clientes')
  const metaReceita = getMetaAtivaPorTipo('receita')
  const metaPacotes = getMetaAtivaPorTipo('pacotes')
  const metaTicket = getMetaAtivaPorTipo('ticket_medio')
  
  // Verificar se tem meta concluída (sem meta ativa)
  const metaConcluidas = {
    sessoes: metas.find(m => m.tipo === 'sessoes' && m.concluida && !metaSessoes),
    clientes: metas.find(m => m.tipo === 'clientes' && m.concluida && !metaClientes),
    receita: metas.find(m => m.tipo === 'receita' && m.concluida && !metaReceita),
    pacotes: metas.find(m => m.tipo === 'pacotes' && m.concluida && !metaPacotes),
    ticket_medio: metas.find(m => m.tipo === 'ticket_medio' && m.concluida && !metaTicket)
  }
  
  // Calcular progresso baseado nas metas definidas pelo usuário
  const sessionsProgress = metaSessoes 
    ? Math.min(100, (dashboardData.sessionsToday / metaSessoes.valor_meta) * 100)
    : 0
  const clientsProgress = metaClientes
    ? Math.min(100, (dashboardData.activeClients / metaClientes.valor_meta) * 100)
    : 0
  const revenueProgress = metaReceita
    ? Math.min(100, (dashboardData.monthlyRevenue / metaReceita.valor_meta) * 100)
    : 0
  const packagesProgress = metaPacotes
    ? Math.min(100, (packageStats.activePackages / metaPacotes.valor_meta) * 100)
    : 0
  const completionProgress = metaTicket
    ? Math.min(100, (dashboardData.completionRate / metaTicket.valor_meta) * 100)
    : 0
  
  const timelineData = [
    {
      id: 1,
      title: "Sessões",
      date: `${currentDay} ${currentMonth}`,
      content: metaSessoes 
        ? `Meta: ${metaSessoes.valor_meta} sessões\nAtual: ${dashboardData.sessionsToday} sessões\n${upcomingSessionsCount} agendada${upcomingSessionsCount !== 1 ? 's' : ''} nos próximos dias.`
        : metaConcluidas.sessoes
        ? `Meta ${metaConcluidas.sessoes.versao} concluída! Defina uma nova meta para continuar.`
        : 'Defina uma meta em Metas para começar.',
      category: "Atendimentos",
      icon: Calendar,
      relatedIds: [],
      status: metaConcluidas.sessoes ? "completed" as const : !metaSessoes ? "pending" as const : sessionsProgress >= 100 ? "completed" as const : "in-progress" as const,
      energy: Math.round(sessionsProgress),
    },
    {
      id: 2,
      title: "Clientes",
      date: currentMonth,
      content: metaClientes
        ? `Meta: ${metaClientes.valor_meta} clientes\nAtual: ${dashboardData.activeClients} clientes\nBase sólida para crescimento sustentável.`
        : metaConcluidas.clientes
        ? `Meta ${metaConcluidas.clientes.versao} concluída! Defina uma nova meta para continuar.`
        : 'Defina uma meta em Metas para começar.',
      category: "Crescimento",
      icon: Users,
      relatedIds: [],
      status: metaConcluidas.clientes ? "completed" as const : !metaClientes ? "pending" as const : clientsProgress >= 100 ? "completed" as const : "in-progress" as const,
      energy: Math.round(clientsProgress),
    },
    {
      id: 3,
      title: "Receita Mensal",
      date: currentMonth,
      content: metaReceita
        ? `Meta: ${formatCurrencyBR(metaReceita.valor_meta)}\nAtual: ${formatCurrencyBR(dashboardData.monthlyRevenue)}\nPendente: ${formatCurrencyBR(dashboardData.pendingRevenue)}`
        : metaConcluidas.receita
        ? `Meta ${metaConcluidas.receita.versao} concluída! Defina uma nova meta para continuar.`
        : 'Defina uma meta em Metas para começar.',
      category: "Financeiro",
      icon: DollarSign,
      relatedIds: [],
      status: metaConcluidas.receita ? "completed" as const : !metaReceita ? "pending" as const : revenueProgress >= 100 ? "completed" as const : "in-progress" as const,
      energy: Math.round(revenueProgress),
    },
    {
      id: 4,
      title: "Pacotes",
      date: currentMonth,
      content: metaPacotes
        ? `Meta: ${metaPacotes.valor_meta} pacotes\nAtual: ${packageStats.activePackages} pacotes\nReceita total: ${formatCurrencyBR(packageStats.totalRevenue)}`
        : metaConcluidas.pacotes
        ? `Meta ${metaConcluidas.pacotes.versao} concluída! Defina uma nova meta para continuar.`
        : 'Defina uma meta em Metas para começar.',
      category: "Produtos",
      icon: Package,
      relatedIds: [],
      status: metaConcluidas.pacotes ? "completed" as const : !metaPacotes ? "pending" as const : packagesProgress >= 100 ? "completed" as const : "in-progress" as const,
      energy: Math.round(packagesProgress),
    },
    {
      id: 5,
      title: "Performance",
      date: currentMonth,
      content: metaTicket
        ? `Meta: ${metaTicket.valor_meta}%\nAtual: ${dashboardData.completionRate}%\nContinue mantendo a consistência nos atendimentos.`
        : metaConcluidas.ticket_medio
        ? `Meta ${metaConcluidas.ticket_medio.versao} concluída! Defina uma nova meta para continuar.`
        : 'Defina uma meta em Metas para começar.',
      category: "Objetivos",
      icon: BadgeDollarSign,
      relatedIds: [],
      status: metaConcluidas.ticket_medio ? "completed" as const : !metaTicket ? "pending" as const : completionProgress >= 100 ? "completed" as const : "in-progress" as const,
      energy: Math.round(completionProgress),
    },
  ]

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-2">Progresso de Metas</h2>
      <RadialOrbitalTimeline timelineData={timelineData} />
    </Card>
  )
}
