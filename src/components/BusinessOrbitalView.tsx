import { Calendar, Users, DollarSign, Package, BadgeDollarSign } from "lucide-react"
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline"
import { formatCurrencyBR } from "@/utils/formatters"
import { Card } from "@/components/ui/card"
import { useMetas, MetaTipo, MetaPeriodo } from "@/hooks/useMetas"
import { useTerminology } from "@/hooks/useTerminology"
import React, { useEffect, useState, useRef } from "react"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, isWithinInterval } from "date-fns"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

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
  const { user } = useAuth()
  const { metas, getMetaAtivaPorTipo, verificarEMarcarMetasConcluidas, getPeriodoLabel } = useMetas()
  const { clientTermPlural } = useTerminology()
  
  // Estado para contagem real de sessões baseada na meta
  const [sessionsFromMeta, setSessionsFromMeta] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  })
  const [weeklyRevenue, setWeeklyRevenue] = useState(0)
  
  const now = new Date()
  const currentMonth = now.toLocaleDateString('pt-BR', { month: 'short' })
  const currentDay = now.getDate()
  
  // Buscar contagem real de sessões a partir da data_inicio da meta
  useEffect(() => {
    const loadSessionsCount = async () => {
      if (!user) return
      
      const metaSessoes = getMetaAtivaPorTipo('sessoes')
      const metaReceita = getMetaAtivaPorTipo('receita')
      
      try {
        const now = new Date()
        const todayStr = startOfDay(now).toISOString().split('T')[0]
        const weekStartStr = startOfWeek(now, { weekStartsOn: 0 }).toISOString().split('T')[0]
        const monthStartStr = startOfMonth(now).toISOString().split('T')[0]
        
        // Buscar todas as sessões do usuário usando o campo 'data' (data da sessão, não created_at)
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id, data')
          .eq('user_id', user.id)
        
        if (!error && sessions) {
          setSessionsFromMeta({
            daily: sessions.filter(s => s.data === todayStr).length,
            weekly: sessions.filter(s => s.data >= weekStartStr).length,
            monthly: sessions.filter(s => s.data >= monthStartStr).length
          })
        }
        
        // Para receita semanal
        if (metaReceita && metaReceita.periodo === 'semanal') {
          const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString().split('T')[0]
          const { data: payments } = await supabase
            .from('payments')
            .select('valor')
            .eq('user_id', user.id)
            .eq('status', 'pago')
            .gte('created_at', weekStart)
          
          if (payments) {
            setWeeklyRevenue(payments.reduce((sum, p) => sum + (p.valor || 0), 0))
          }
        }
      } catch (error) {
        console.error('Erro ao carregar sessões para metas:', error)
      }
    }
    
    loadSessionsCount()
  }, [user, metas])
  
  // Verificar e marcar metas concluídas automaticamente
  // Usamos refs para evitar chamadas múltiplas com os mesmos valores e debounce
  const lastCheckedValuesRef = useRef<string>('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Debounce de 500ms para evitar múltiplas chamadas rápidas
    debounceTimerRef.current = setTimeout(() => {
      const valoresAtuais = {
        sessoes: sessionsFromMeta.monthly,
        clientes: dashboardData.activeClients,
        receita: dashboardData.monthlyRevenue,
        pacotes: packageStats.activePackages,
        ticket_medio: dashboardData.completionRate
      };
      
      // Criar uma chave única para os valores atuais
      const valuesKey = JSON.stringify(valoresAtuais);
      
      // Só verificar se os valores mudaram
      if (valuesKey !== lastCheckedValuesRef.current) {
        lastCheckedValuesRef.current = valuesKey;
        verificarEMarcarMetasConcluidas(valoresAtuais);
      }
    }, 500)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [dashboardData, packageStats, sessionsFromMeta])
  
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
        if (periodo === 'diario') return sessionsFromMeta.daily
        if (periodo === 'semanal') return sessionsFromMeta.weekly
        return sessionsFromMeta.monthly
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
      // Para Performance, verificar se o valor ATUAL (completionRate) >= meta definida
      // Só marca como completed se meta ativa existir E progresso >= 100, OU se meta foi concluída anteriormente sem meta ativa
      status: metaConcluidas.ticket_medio && !metaTicket 
        ? "completed" as const 
        : !metaTicket 
        ? "pending" as const 
        : dashboardData.completionRate >= metaTicket.valor_meta 
        ? "completed" as const 
        : "in-progress" as const,
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
