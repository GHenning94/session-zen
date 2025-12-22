import { Calendar, Users, DollarSign, Package, BadgeDollarSign } from "lucide-react"
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline"
import { formatCurrencyBR } from "@/utils/formatters"
import { Card } from "@/components/ui/card"
import { useMetas, MetaTipo, MetaPeriodo } from "@/hooks/useMetas"
import { useTerminology } from "@/hooks/useTerminology"
import { useEffect } from "react"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"

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
  // Dados adicionais para cálculos por período
  weeklySessionsCount?: number
  monthlySessionsCount?: number
  weeklyRevenue?: number
}

export const BusinessOrbitalView = ({ 
  dashboardData, 
  packageStats,
  upcomingSessionsCount,
  weeklySessionsCount = 0,
  monthlySessionsCount = 0,
  weeklyRevenue = 0
}: BusinessOrbitalViewProps) => {
  const { metas, getMetaAtivaPorTipo, verificarEMarcarMetasConcluidas, getPeriodoLabel } = useMetas()
  const { clientTermPlural } = useTerminology()
  
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
  
  // Verificar se tem meta concluída (sem meta ativa) - pegar a mais recente
  const getMetaConcluidaMaisRecente = (tipo: MetaTipo) => {
    // Verificar se há meta ativa deste tipo
    const temMetaAtiva = !!getMetaAtivaPorTipo(tipo);
    if (temMetaAtiva) return undefined;
    
    // Se não há meta ativa, buscar a meta concluída mais recente
    const metasConcluidas = metas.filter(m => m.tipo === tipo && m.concluida && !m.ativa);
    if (metasConcluidas.length === 0) return undefined;
    
    return metasConcluidas.sort((a, b) => 
      new Date(b.data_conclusao || b.created_at).getTime() - new Date(a.data_conclusao || a.created_at).getTime()
    )[0];
  };
  
  const metaConcluidas = {
    sessoes: getMetaConcluidaMaisRecente('sessoes'),
    clientes: getMetaConcluidaMaisRecente('clientes'),
    receita: getMetaConcluidaMaisRecente('receita'),
    pacotes: getMetaConcluidaMaisRecente('pacotes'),
    ticket_medio: getMetaConcluidaMaisRecente('ticket_medio')
  }
  
  // Helper para obter valor atual baseado no período
  const getValorAtualPorPeriodo = (tipo: MetaTipo, periodo: MetaPeriodo): number => {
    switch (tipo) {
      case 'sessoes':
        if (periodo === 'diario') return dashboardData.sessionsToday
        if (periodo === 'semanal') return weeklySessionsCount
        return monthlySessionsCount
      case 'clientes':
        return dashboardData.activeClients // Clientes ativos não depende de período
      case 'receita':
        if (periodo === 'diario') return 0 // Não faz sentido receita diária
        if (periodo === 'semanal') return weeklyRevenue
        return dashboardData.monthlyRevenue
      case 'pacotes':
        return packageStats.activePackages // Pacotes ativos não depende de período
      case 'ticket_medio':
        return dashboardData.completionRate // Performance não depende de período
      default:
        return 0
    }
  }

  // Helper para obter label do período
  const getPeriodoLabelCurto = (periodo: MetaPeriodo): string => {
    switch (periodo) {
      case 'diario': return 'Hoje'
      case 'semanal': return 'Semana'
      case 'mensal': return 'Mês'
    }
  }
  
  // Calcular progresso baseado nas metas definidas pelo usuário e seu período
  const calcularProgresso = (meta: typeof metaSessoes) => {
    if (!meta) return 0
    const valorAtual = getValorAtualPorPeriodo(meta.tipo as MetaTipo, meta.periodo)
    return Math.min(100, (valorAtual / meta.valor_meta) * 100)
  }

  const sessionsProgress = metaSessoes ? calcularProgresso(metaSessoes) : 0
  const clientsProgress = metaClientes ? calcularProgresso(metaClientes) : 0
  const revenueProgress = metaReceita ? calcularProgresso(metaReceita) : 0
  const packagesProgress = metaPacotes ? calcularProgresso(metaPacotes) : 0
  const completionProgress = metaTicket ? calcularProgresso(metaTicket) : 0
  
  const timelineData = [
    {
      id: 1,
      title: "Sessões",
      date: metaSessoes ? getPeriodoLabelCurto(metaSessoes.periodo) : `${currentDay} ${currentMonth}`,
      content: metaSessoes 
        ? `Meta (${getPeriodoLabel(metaSessoes.periodo)}): ${metaSessoes.valor_meta} sessões\nAtual: ${getValorAtualPorPeriodo('sessoes', metaSessoes.periodo)} sessões\n${upcomingSessionsCount} agendada${upcomingSessionsCount !== 1 ? 's' : ''} nos próximos dias.`
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
      title: clientTermPlural,
      date: metaClientes ? getPeriodoLabelCurto(metaClientes.periodo) : currentMonth,
      content: metaClientes
        ? `Meta: ${metaClientes.valor_meta} ${clientTermPlural.toLowerCase()}\nAtual: ${dashboardData.activeClients} ${clientTermPlural.toLowerCase()}\nBase sólida para crescimento sustentável.`
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
      title: "Receita",
      date: metaReceita ? getPeriodoLabelCurto(metaReceita.periodo) : currentMonth,
      content: metaReceita
        ? `Meta (${getPeriodoLabel(metaReceita.periodo)}): ${formatCurrencyBR(metaReceita.valor_meta)}\nAtual: ${formatCurrencyBR(getValorAtualPorPeriodo('receita', metaReceita.periodo))}\nPendente: ${formatCurrencyBR(dashboardData.pendingRevenue)}`
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
      date: metaPacotes ? getPeriodoLabelCurto(metaPacotes.periodo) : currentMonth,
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
      date: metaTicket ? getPeriodoLabelCurto(metaTicket.periodo) : currentMonth,
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
