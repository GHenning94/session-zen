import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ClientAvatar } from "@/components/ClientAvatar"
import { NotificationPermissionBanner } from "@/components/NotificationPermissionBanner"
import { PackageStatusCard } from "@/components/PackageStatusCard"
import { PaymentStatusCard } from "@/components/PaymentStatusCard"
import { SmartNotificationCard } from "@/components/SmartNotificationCard"
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Crown
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Layout } from "@/components/Layout"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { NewClientModal } from "@/components/NewClientModal"
import { NewPaymentModal } from "@/components/NewPaymentModal"
import { UpgradePlanCard } from "@/components/UpgradePlanCard"
import { ActionableNotificationsBanner } from "@/components/ActionableNotificationsBanner"
import { TutorialButton } from "@/components/TutorialButton"
import { TutorialModal } from "@/components/TutorialModal"
import { formatCurrencyBR, formatTimeBR, formatDateBR } from "@/utils/formatters"

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentPlan } = useSubscription()
  const [dashboardData, setDashboardData] = useState({
    sessionsToday: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    pendingRevenue: 0,
    completionRate: 94
  })
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const [recentClients, setRecentClients] = useState<any[]>([])
  const [monthlyChart, setMonthlyChart] = useState<any[]>([])
  const [ticketMedioChart, setTicketMedioChart] = useState<any[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [clientTicketMedio, setClientTicketMedio] = useState<any[]>([])
  const [receitaPorCanal, setReceitaPorCanal] = useState<any[]>([])
  const [dynamicReminders, setDynamicReminders] = useState<any[]>([])
  const [chartPeriod, setChartPeriod] = useState<'1' | '3' | '6' | '12'>('12')
  const [ticketPeriod, setTicketPeriod] = useState<'1' | '3' | '6' | '12'>('12')
  const [canalPeriod, setCanalPeriod] = useState<'1' | '3' | '6' | '12'>('12')
  const [canalDataCache, setCanalDataCache] = useState<any[]>([])
  const [packageStats, setPackageStats] = useState({
    totalPackages: 0,
    activePackages: 0,
    totalSessions: 0,
    consumedSessions: 0,
    remainingSessions: 0,
    totalRevenue: 0,
    packagesNearEnd: 0
  })
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0
  })
  const [smartNotifications, setSmartNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Cooperative cancellation refs
  const isActiveRef = useRef(true)
  const requestIdRef = useRef(0)
  
  // Granular cache timestamps (in milliseconds)
  const [cacheTimestamps, setCacheTimestamps] = useState({
    upcomingSessions: 0,
    recentPayments: 0,
    recentClients: 0,
    dashboardStats: 0,
    charts: 0
  })

  // Invalidate specific cache sections
  const invalidateCache = useCallback((sections: Array<keyof typeof cacheTimestamps>) => {
    setCacheTimestamps(prev => {
      const updated = { ...prev }
      sections.forEach(section => {
        updated[section] = 0
      })
      return updated
    })
  }, [])

  // Optimized loading with granular caching
  const loadDashboardDataOptimized = useCallback(async (forceFresh = false, sections?: Array<keyof typeof cacheTimestamps>) => {
    const requestId = ++requestIdRef.current
    const isStale = () => !isActiveRef.current || requestId !== requestIdRef.current || !user
    
    if (isStale()) return
    
    try {
      if (isStale()) return
      console.log('🔄 Carregando dados do dashboard...', forceFresh ? '(FORCE FRESH)' : '', sections || 'ALL')
      await loadDashboardData(forceFresh, sections, isStale)
    } catch (error) {
      if (!isStale()) {
        console.error('Erro ao carregar dados do dashboard:', error)
      }
    }
  }, [user])

  // Component lifecycle management
  useEffect(() => {
    isActiveRef.current = true
    return () => {
      isActiveRef.current = false
    }
  }, [])

  useEffect(() => {
    console.log('🎯 useEffect principal disparado, user:', user?.id)
    if (user && isActiveRef.current) {
      console.log('👤 Usuário encontrado, carregando dados...')
      loadDashboardDataOptimized(true)
    }
  }, [user, loadDashboardDataOptimized])

  // Sempre recarregar quando o Dashboard é montado (volta de outra página)
  useEffect(() => {
    if (user && isActiveRef.current) {
      console.log('🔄 Dashboard montado, forçando atualização...')
      invalidateCache(['upcomingSessions', 'recentPayments', 'dashboardStats'])
      loadDashboardDataOptimized(true)
    }
  }, [])

  // Optimized event listeners with debouncing
  useEffect(() => {
    if (!user) return

    let timeoutId: NodeJS.Timeout

    const handleDataChange = (sections?: Array<keyof typeof cacheTimestamps>) => {
      if (user && isActiveRef.current) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (isActiveRef.current) {
            invalidateCache(sections || ['upcomingSessions', 'recentPayments', 'recentClients', 'dashboardStats', 'charts'])
            loadDashboardDataOptimized(true, sections)
          }
        }, 300)
      }
    }

    const onStorage = () => handleDataChange()
    const handleClientAdded = () => handleDataChange(['recentClients', 'dashboardStats'])
    const handleSessionAdded = () => handleDataChange(['upcomingSessions', 'dashboardStats', 'recentPayments'])
    const handleSessionUpdated = () => handleDataChange(['upcomingSessions', 'dashboardStats', 'recentPayments'])
    const handlePaymentAdded = () => handleDataChange(['recentPayments', 'dashboardStats'])
    const handlePaymentUpdated = () => handleDataChange(['recentPayments', 'dashboardStats'])

    window.addEventListener('storage', onStorage)
    window.addEventListener('clientAdded', handleClientAdded)
    window.addEventListener('paymentAdded', handlePaymentAdded)
    window.addEventListener('paymentUpdated', handlePaymentUpdated)
    window.addEventListener('sessionAdded', handleSessionAdded)
    window.addEventListener('sessionUpdated', handleSessionUpdated)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('clientAdded', handleClientAdded)
      window.removeEventListener('paymentAdded', handlePaymentAdded)
      window.removeEventListener('paymentUpdated', handlePaymentUpdated)
      window.removeEventListener('sessionAdded', handleSessionAdded)
      window.removeEventListener('sessionUpdated', handleSessionUpdated)
    }
  }, [user, loadDashboardDataOptimized, invalidateCache])

  // Optimized real-time updates
  useEffect(() => {
    if (!user) return

    const sessionsChannel = supabase
      .channel('dashboard-sessions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'sessions',
          filter: `user_id=eq.${user.id}` 
        }, 
        () => {
          invalidateCache(['upcomingSessions', 'recentPayments', 'dashboardStats'])
          loadDashboardDataOptimized(true, ['upcomingSessions', 'recentPayments', 'dashboardStats'])
        }
      )
      .subscribe()
      
    const clientsChannel = supabase
      .channel('dashboard-clients')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'clients',
          filter: `user_id=eq.${user.id}` 
        }, 
        () => {
          invalidateCache(['recentClients', 'dashboardStats'])
          loadDashboardDataOptimized(true, ['recentClients', 'dashboardStats'])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(clientsChannel)
    }
  }, [user, loadDashboardDataOptimized])

  const loadDashboardData = async (forceFresh = false, sections?: Array<keyof typeof cacheTimestamps>, isStale?: () => boolean) => {
    const checkStale = isStale || (() => !isActiveRef.current || !user)
    
    if (checkStale()) return
    
    // Sempre mostrar loading quando forçar atualização completa
    const shouldShowLoading = forceFresh && (!sections || sections.length > 2)
    
    if (shouldShowLoading) {
      setIsLoading(true)
    }
    
    try {
      const now = Date.now()
      const CACHE_TIMES = {
        upcomingSessions: 30000, // 30s
        recentPayments: 30000, // 30s
        recentClients: 60000, // 60s
        dashboardStats: 60000, // 60s
        charts: 300000 // 5min
      }
      
      // Check which sections need loading
      const needsLoad = (section: keyof typeof cacheTimestamps) => {
        if (forceFresh) return !sections || sections.includes(section)
        return now - cacheTimestamps[section] > CACHE_TIMES[section]
      }
      
      const loadUpcoming = needsLoad('upcomingSessions')
      const loadPayments = needsLoad('recentPayments')
      const loadClients = needsLoad('recentClients')
      const loadStats = needsLoad('dashboardStats')
      const loadCharts = needsLoad('charts')
      
      if (!loadUpcoming && !loadPayments && !loadClients && !loadStats && !loadCharts) {
        if (!checkStale()) console.log('🚀 All sections cached, skipping load')
        return
      }
      
      if (checkStale()) return
      
      if (!checkStale()) {
        console.log('🔄 Loading sections:', { loadUpcoming, loadPayments, loadClients, loadStats, loadCharts })
        console.log('🔄 Loading fresh dashboard data...')
      }
      
      const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`
      
      // Parallel queries for better performance
      const [
        todaySessionsResult,
        clientsCountResult,
        monthlyPaymentsResult,
        pendingSessionsResult,
        upcomingDataResult,
        paymentsDataResult,
        recentClientsDataResult,
        allClientsWithPaymentsResult,
        allPaymentMethodsResult,
        packagesDataResult,
        allSessionsForPaymentStatusResult
      ] = await Promise.all([
        // Buscar TODAS as sessões de hoje, sem considerar horário para filtro inicial
        supabase.from('sessions').select('id, data, horario, status, valor, client_id, clients(nome, avatar_url)').eq('user_id', user?.id).eq('data', today).order('horario'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('sessions').select('valor').eq('user_id', user?.id).eq('status', 'realizada').gte('data', `${new Date().toISOString().slice(0, 7)}-01`).lt('data', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)),
        supabase.from('sessions').select('valor, data, status').eq('user_id', user?.id).in('status', ['agendada']).lt('data', today),
        // Buscar sessões futuras incluindo hoje
        supabase.from('sessions').select('id, data, horario, status, valor, client_id, clients(id, nome, avatar_url)').eq('user_id', user?.id).eq('status', 'agendada').gte('data', today).order('data').order('horario').limit(20),
        supabase.from('sessions').select('id, data, horario, status, valor, client_id, metodo_pagamento, updated_at, clients(nome, avatar_url)').eq('user_id', user?.id).order('updated_at', { ascending: false }).limit(4),
        supabase.from('clients').select('id, nome, avatar_url, created_at').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('sessions').select('client_id, valor, clients(nome, avatar_url)').eq('user_id', user?.id).eq('status', 'realizada').not('client_id', 'is', null).not('valor', 'is', null),
        supabase.from('sessions').select('metodo_pagamento, valor').eq('user_id', user?.id).eq('status', 'realizada').not('valor', 'is', null).not('metodo_pagamento', 'is', null),
        supabase.from('packages').select('*').eq('user_id', user?.id),
        supabase.from('sessions').select('valor, status, data').eq('user_id', user?.id).not('valor', 'is', null)
      ])
      
      if (checkStale()) return
      
      const todaySessions = todaySessionsResult.data
      const clientsCount = clientsCountResult.count

      const monthlyPayments = monthlyPaymentsResult.data
      const monthlyRevenue = monthlyPayments?.reduce((sum, session) => sum + (session.valor || 0), 0) || 0
      
      const pendingSessions = pendingSessionsResult.data
      const pendingRevenue = pendingSessions?.reduce((sum, session) => sum + (session.valor || 0), 0) || 0

      const nowDate = new Date()
      
      const upcomingData = upcomingDataResult.data
      // Filtrar sessões futuras considerando data E horário
      const filteredUpcoming = upcomingData?.filter(session => {
        const sessionDateTime = new Date(`${session.data}T${session.horario}`)
        return sessionDateTime > nowDate
      }).slice(0, 4)
      
      const paymentsData = paymentsDataResult.data
      const recentClientsData = recentClientsDataResult.data

      // ✅ OTIMIZAÇÃO: Buscar todos os dados de gráficos com UMA query ao invés de múltiplas
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]
      
      // Buscar todas as sessões do último ano de uma vez
      const { data: yearSessions } = await supabase
        .from('sessions')
        .select('valor, status, data')
        .eq('user_id', user?.id)
        .gte('data', oneYearAgoStr)
        .not('valor', 'is', null)
      
      if (checkStale()) return
      
      // Processar dados do gráfico mensal em memória (muito mais rápido)
      const chartData = []
      const ticketMedioData = []
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        
        const monthStartStr = monthStart.toISOString().split('T')[0]
        const monthEndStr = monthEnd.toISOString().split('T')[0]
        
        // Filtrar sessões do mês em memória
        const monthSessions = yearSessions?.filter(s => 
          s.data >= monthStartStr && s.data <= monthEndStr && s.status === 'realizada'
        ) || []
        
        const monthPendingSessions = yearSessions?.filter(s => 
          s.data >= monthStartStr && s.data <= monthEndStr && s.status === 'agendada'
        ) || []
        
        const revenue = monthSessions.reduce((sum, session) => sum + (session.valor || 0), 0)
        const pending = monthPendingSessions.reduce((sum, session) => sum + (session.valor || 0), 0)
        
        const totalRevenue = monthSessions.reduce((sum, session) => sum + (session.valor || 0), 0)
        const totalSessions = monthSessions.length
        const ticketMedio = totalSessions > 0 ? totalRevenue / totalSessions : 0
        
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const monthNamesLong = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        
        chartData.push({
          mes: monthNames[date.getMonth()],
          receita: revenue,
          aReceber: pending,
          fullMonth: `${monthNamesLong[date.getMonth()]} ${date.getFullYear()}`
        })
        
        ticketMedioData.push({
          mes: monthNames[date.getMonth()],
          ticketMedio: ticketMedio,
          sessoes: totalSessions,
          fullMonth: `${monthNamesLong[date.getMonth()]} ${date.getFullYear()}`
        })
      }
      
      if (checkStale()) return

      const allClientsWithPayments = allClientsWithPaymentsResult.data

      const clientPayments = {}
      allClientsWithPayments?.forEach(session => {
        if (session.client_id && session.clients?.nome && session.valor) {
          if (!clientPayments[session.client_id]) {
            clientPayments[session.client_id] = {
              nome: session.clients.nome,
              avatar_url: session.clients.avatar_url,
              total: 0,
              sessoes: 0
            }
          }
          clientPayments[session.client_id].total += Number(session.valor) || 0
          clientPayments[session.client_id].sessoes += 1
        }
      })

      if (checkStale()) return
      if (!checkStale()) console.log('👥 Pagamentos por cliente processados:', clientPayments)

      const topClientsData = Object.entries(clientPayments)
        .map(([clientId, data]: [string, any]) => ({
          clientId,
          nome: data.nome,
          avatar_url: data.avatar_url,
          total: data.total,
          sessoes: data.sessoes,
          ticketMedio: data.sessoes > 0 ? data.total / data.sessoes : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      if (checkStale()) return
      if (!checkStale()) console.log('👥 Top 5 clientes calculados:', topClientsData)

      // Calcular ticket médio por cliente (todos os clientes com sessões)
      const clientTicketMedioData = Object.entries(clientPayments)
        .map(([clientId, data]: [string, any]) => ({
          clientId,
          nome: data.nome,
          ticketMedio: data.sessoes > 0 ? data.total / data.sessoes : 0,
          sessoes: data.sessoes
        }))
        .filter(client => client.sessoes > 0)
        .sort((a, b) => b.ticketMedio - a.ticketMedio)

      if (checkStale()) return
      if (!checkStale()) console.log('📊 Ticket médio por cliente calculado:', clientTicketMedioData)

      const allPaymentMethods = allPaymentMethodsResult.data

      const canalPayments = {}
      allPaymentMethods?.forEach(session => {
        const metodo = session.metodo_pagamento || 'A definir'
        if (!canalPayments[metodo]) {
          canalPayments[metodo] = 0
        }
        canalPayments[metodo] += Number(session.valor) || 0
      })

      const canalColors = {
        'pix': '#00D09C',
        'cartao': '#6366F1', 
        'dinheiro': '#F59E0B',
        'transferencia': '#8B5CF6',
        'A definir': '#6B7280'
      }

      const receitaPorCanalData = Object.entries(canalPayments)
        .map(([canal, valor]: [string, any]) => ({
          canal: canal.charAt(0).toUpperCase() + canal.slice(1),
          valor: valor,
          color: canalColors[canal as keyof typeof canalColors] || '#6B7280'
        }))
        .sort((a, b) => b.valor - a.valor)

      if (checkStale()) return
      if (!checkStale()) console.log('💳 Receita por canal calculada:', receitaPorCanalData)

      // Calcular estatísticas de pacotes
      const packagesData = packagesDataResult.data || []
      const activePackages = packagesData.filter(p => p.status === 'ativo')
      const totalSessions = packagesData.reduce((sum, p) => sum + (p.total_sessoes || 0), 0)
      const consumedSessions = packagesData.reduce((sum, p) => sum + (p.sessoes_consumidas || 0), 0)
      const remainingSessions = totalSessions - consumedSessions
      const totalPackageRevenue = packagesData.reduce((sum, p) => sum + (p.valor_total || 0), 0)
      const packagesNearEnd = activePackages.filter(p => {
        const remaining = (p.total_sessoes || 0) - (p.sessoes_consumidas || 0)
        return remaining <= 2 && remaining > 0
      }).length

      // Preparar dados de estatísticas de pacotes (não setar ainda)
      const packageStatsData = {
        totalPackages: packagesData.length,
        activePackages: activePackages.length,
        totalSessions,
        consumedSessions,
        remainingSessions,
        totalRevenue: totalPackageRevenue,
        packagesNearEnd
      }

      // Calcular estatísticas de pagamentos (não setar ainda)
      const allSessionsForPaymentStatus = allSessionsForPaymentStatusResult.data || []
      const paidSessions = allSessionsForPaymentStatus.filter(s => s.status === 'realizada')
      const pendingPaymentSessions = allSessionsForPaymentStatus.filter(s => s.status === 'agendada')
      const overdueSessionsForStats = allSessionsForPaymentStatus.filter(s => s.status === 'agendada' && new Date(s.data) < new Date())

      const paymentStatsData = {
        totalPaid: paidSessions.reduce((sum, s) => sum + (s.valor || 0), 0),
        totalPending: pendingPaymentSessions.reduce((sum, s) => sum + (s.valor || 0), 0),
        paidCount: paidSessions.length,
        pendingCount: pendingPaymentSessions.length
      }

      // Gerar notificações inteligentes
      const notifications: any[] = []

      // Notificação: Sessões passadas que ainda estão como 'agendada' - PRECISAM DE ATENÇÃO
      const sessionsNeedingAttention = todaySessions.concat(upcomingSessions).filter(s => {
        if (s.status !== 'agendada') return false
        const sessionDateTime = new Date(`${s.data}T${s.horario}`)
        const now = new Date()
        return sessionDateTime < now
      })
      if (sessionsNeedingAttention.length > 0) {
        notifications.push({
          id: 'sessions-need-attention',
          type: 'session_needs_update' as const,
          priority: 'high' as const,
          title: 'Sessões precisam de atualização',
          message: `${sessionsNeedingAttention.length} sessão${sessionsNeedingAttention.length > 1 ? 'ões passadas precisam' : ' passada precisa'} de atualização de status`,
          actionUrl: '/agenda',
          actionLabel: 'Atualizar Status',
          metadata: { count: sessionsNeedingAttention.length, sessionIds: sessionsNeedingAttention.map(s => s.id) }
        })
      }

      // Notificação: Pagamentos pendentes
      if (overdueSessionsForStats.length > 0) {
        const overdueAmount = overdueSessionsForStats.reduce((sum, s) => sum + (Number(s.valor) || 0), 0)
        notifications.push({
          id: 'overdue-payments',
          type: 'payment_overdue' as const,
          priority: 'high' as const,
          title: 'Pagamentos pendentes',
          message: `${overdueSessionsForStats.length} sessão${overdueSessionsForStats.length > 1 ? 'ões' : ''} com pagamento pendente`,
          actionUrl: '/pagamentos?status=pendente',
          actionLabel: 'Ver Pagamentos',
          metadata: { count: overdueSessionsForStats.length, amount: overdueAmount }
        })
      }

      // Notificação: Sessões próximas não confirmadas (próximas 24h)
      const upcomingSessionsNotifications = todaySessions.concat(upcomingSessions).filter(s => {
        const sessionDateTime = new Date(`${s.data}T${s.horario}`)
        const now = new Date()
        const diff = sessionDateTime.getTime() - now.getTime()
        const hours = diff / (1000 * 60 * 60)
        return hours > 0 && hours <= 24 && s.status === 'agendada'
      })
      if (upcomingSessionsNotifications.length > 0) {
        notifications.push({
          id: 'upcoming-sessions',
          type: 'recurring_next' as const,
          priority: 'medium' as const,
          title: 'Sessões próximas',
          message: `${upcomingSessionsNotifications.length} sessão${upcomingSessionsNotifications.length > 1 ? 'ões' : ''} nas próximas 24 horas`,
          actionUrl: '/agenda',
          actionLabel: 'Ver Agenda'
        })
      }

      // Preparar notificações (não setar ainda)

      // Gerar lembretes dinâmicos (apenas eventos futuros)
      const reminders = []
      
      // Próximas sessões (apenas futuras)
      if (filteredUpcoming && filteredUpcoming.length > 0) {
        const nextSession = filteredUpcoming[0]
        // Parse manual da data para evitar problemas de timezone
        const [year, month, day] = nextSession.data.split('-')
        const sessionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        const sessionTime = new Date(`${nextSession.data}T${nextSession.horario}`)
        const isToday = sessionDate.toDateString() === nowDate.toDateString()
        
        if (isToday) {
          reminders.push(`${nextSession.clients?.nome || 'Cliente'} tem consulta às ${new Date(`2000-01-01T${nextSession.horario}`).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} hoje`)
        } else {
          reminders.push(`Próxima consulta: ${nextSession.clients?.nome || 'Cliente'} em ${sessionDate.toLocaleDateString('pt-BR')}`)
        }
      }
      
      // Sessões pendentes de pagamento (apenas futuras ou recentes)
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 7)
      const pendingPayments = paymentsData?.filter(session => 
        session.status === 'agendada' && 
        new Date(session.data) >= recentDate
      )?.length || 0
      
      if (pendingPayments > 0) {
        reminders.push(`${pendingPayments} sessões precisam de acompanhamento de pagamento`)
      }
      
      // Clientes novos
      if (recentClientsData && recentClientsData.length > 0) {
        const newClientsThisWeek = recentClientsData.filter(client => {
          const clientDate = new Date(client.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return clientDate > weekAgo
        }).length
        
        if (newClientsThisWeek > 0) {
          reminders.push(`${newClientsThisWeek} novo${newClientsThisWeek > 1 ? 's' : ''} cliente${newClientsThisWeek > 1 ? 's' : ''} esta semana`)
        }
      }

      if (reminders.length === 0) {
        reminders.push('Nenhum lembrete importante no momento')
      }

      if (checkStale()) return

      // Preparar dashboard data (não setar ainda)
      const dashboardDataPrepared = {
        sessionsToday: todaySessions?.length || 0,
        activeClients: clientsCount || 0,
        monthlyRevenue,
        pendingRevenue,
        completionRate: 94
      }

      // Ordenar upcoming sessions e recent payments (futuras primeiro, depois passadas)
      const sortedUpcoming = (filteredUpcoming || []).sort((a, b) => {
        const now = new Date()
        const dateTimeA = new Date(`${a.data}T${a.horario}`)
        const dateTimeB = new Date(`${b.data}T${b.horario}`)
        
        const isFutureA = dateTimeA >= now
        const isFutureB = dateTimeB >= now
        
        // Sessões futuras vêm primeiro
        if (isFutureA && !isFutureB) return -1
        if (!isFutureA && isFutureB) return 1
        
        // Se ambas são futuras ou ambas são passadas, ordenar pela mais próxima
        if (isFutureA && isFutureB) {
          return dateTimeA.getTime() - dateTimeB.getTime() // Mais próxima primeiro
        } else {
          return dateTimeB.getTime() - dateTimeA.getTime() // Mais recente primeiro
        }
      })
      
      const sortedPayments = (paymentsData || []).sort((a, b) => {
        const now = new Date()
        const dateTimeA = new Date(`${a.data}T${a.horario}`)
        const dateTimeB = new Date(`${b.data}T${b.horario}`)
        
        const isFutureA = dateTimeA >= now
        const isFutureB = dateTimeB >= now
        
        // Pagamentos futuros vêm primeiro
        if (isFutureA && !isFutureB) return -1
        if (!isFutureA && isFutureB) return 1
        
        // Se ambos são futuros ou ambos são passados, ordenar pela mais próxima
        if (isFutureA && isFutureB) {
          return dateTimeA.getTime() - dateTimeB.getTime() // Mais próximo primeiro
        } else {
          return dateTimeB.getTime() - dateTimeA.getTime() // Mais recente primeiro
        }
      })
      
      // ✅ ATUALIZAR TODOS OS ESTADOS DE UMA VEZ (BATCH UPDATE)
      // Isso garante que todos os cards só aparecem quando os dados estão completos
      setPackageStats(packageStatsData)
      setPaymentStats(paymentStatsData)
      setSmartNotifications(notifications)
      setDashboardData(dashboardDataPrepared)
      setUpcomingSessions(sortedUpcoming)
      setRecentPayments(sortedPayments)
      setRecentClients(recentClientsData || [])
      setMonthlyChart(chartData)
      setTicketMedioChart(ticketMedioData)
      setTopClients(topClientsData)
      setClientTicketMedio(clientTicketMedioData)
      setReceitaPorCanal(receitaPorCanalData)
      setCanalDataCache(receitaPorCanalData)
      setDynamicReminders(reminders)
      
      if (checkStale()) return
      
      // Update cache timestamps for loaded sections
      setCacheTimestamps(prev => {
        const updated = { ...prev }
        if (loadStats) updated.dashboardStats = now
        if (loadUpcoming) updated.upcomingSessions = now
        if (loadPayments) updated.recentPayments = now
        if (loadClients) updated.recentClients = now
        if (loadCharts) updated.charts = now
        return updated
      })

      if (!checkStale()) {
        console.log('✅ Todos os dados foram atualizados no estado:')
        console.log('📊 Monthly Chart:', chartData.length, 'itens')
        console.log('📈 Ticket Médio Chart:', ticketMedioData.length, 'itens')
        console.log('👑 Top Clients:', topClientsData.length, 'itens')
        console.log('📊 Client Ticket Médio:', clientTicketMedioData.length, 'itens')
        console.log('💾 Dashboard cached successfully!')
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      // Aguardar um tick para garantir que todos os estados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 100))
      if (shouldShowLoading) {
        setIsLoading(false)
      }
    }
  }

  // Independent filter handlers - no cross-interference
  const handlePeriodChange = (period: '1' | '3' | '6' | '12') => {
    console.log('📊 Mudando período do gráfico de receita para:', period)
    setChartPeriod(period)
    // Only affects revenue chart - no reloading needed
  }

  const handleTicketPeriodChange = (period: '1' | '3' | '6' | '12') => {
    console.log('📈 Mudando período do ticket médio para:', period)
    setTicketPeriod(period)
    // Only affects ticket chart - no reloading needed
  }

  const handleCanalPeriodChange = useCallback(async (period: '1' | '3' | '6' | '12') => {
    console.log('💳 Mudando período dos canais para:', period)
    setCanalPeriod(period)
    
    if (!user) return
    
    const monthsToQuery = parseInt(period)
    const cacheKey = `canal_${user.id}_${period}`
    const cached = localStorage.getItem(cacheKey)
    const cacheTime = localStorage.getItem(`${cacheKey}_time`)
    
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 180000) {
      console.log('🚀 Loading canal data from cache...')
      setReceitaPorCanal(JSON.parse(cached))
      return
    }
    
    // Load filtered data for pie chart
    await loadCanalData(period)
  }, [user])

  // Load canal data with period filter
  const loadCanalData = async (period: '1' | '3' | '6' | '12') => {
    try {
      if (!user) return

      console.log('💳 Carregando dados do canal para período:', period)
      
      // Calculate date range based on period
      const currentDate = new Date()
      const startDate = new Date()
      const monthsToSubtract = parseInt(period)
      startDate.setMonth(currentDate.getMonth() - monthsToSubtract)
      
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = currentDate.toISOString().split('T')[0]
      
      console.log('💳 Buscando dados de', startDateStr, 'até', endDateStr)

      const { data: periodPaymentMethods } = await supabase
        .from('sessions')
        .select('metodo_pagamento, valor')
        .eq('user_id', user.id)
        .eq('status', 'realizada')
        .gte('data', startDateStr)
        .lte('data', endDateStr)
        .not('valor', 'is', null)
        .not('metodo_pagamento', 'is', null)

      console.log('💳 Dados filtrados encontrados:', periodPaymentMethods)

      const canalPayments = {}
      periodPaymentMethods?.forEach(session => {
        const metodo = session.metodo_pagamento || 'A definir'
        if (!canalPayments[metodo]) {
          canalPayments[metodo] = 0
        }
        canalPayments[metodo] += Number(session.valor) || 0
      })

      const canalColors = {
        'pix': '#00D09C',
        'cartao': '#6366F1', 
        'dinheiro': '#F59E0B',
        'transferencia': '#8B5CF6',
        'A definir': '#6B7280'
      }

      const filteredCanalData = Object.entries(canalPayments)
        .map(([canal, valor]: [string, any]) => ({
          canal: canal.charAt(0).toUpperCase() + canal.slice(1),
          valor: valor,
          color: canalColors[canal as keyof typeof canalColors] || '#6B7280'
        }))
        .sort((a, b) => b.valor - a.valor)

      console.log('💳 Dados filtrados processados:', filteredCanalData)
      setReceitaPorCanal(filteredCanalData)
      
      // Cache the data
      const cacheKey = `canal_${user.id}_${period}`
      localStorage.setItem(cacheKey, JSON.stringify(filteredCanalData))
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString())

    } catch (error) {
      console.error('Erro ao carregar dados do canal:', error)
    }
  }

  const handleNewSession = () => {
    navigate('/sessoes')
  }

  const handleNewClient = () => {
    setIsNewClientOpen(true)
  }

  const handleNewPayment = () => {
    setIsNewPaymentOpen(true)
  }

  const handleOpenTutorial = () => {
    setIsTutorialOpen(true)
  }

  // Memoized calculations for performance
  const filteredMonthlyChart = useMemo(() => {
    const totalMonths = monthlyChart.length;
    let startIndex = 0;
    
    switch(chartPeriod) {
      case '1':
        startIndex = totalMonths - 1;
        break;
      case '3':
        startIndex = Math.max(0, totalMonths - 3);
        break;
      case '6':
        startIndex = Math.max(0, totalMonths - 6);
        break;
      case '12':
      default:
        startIndex = 0;
        break;
    }
    
    return monthlyChart.slice(startIndex);
  }, [monthlyChart, chartPeriod])

  const filteredTicketChart = useMemo(() => {
    const totalMonths = ticketMedioChart.length;
    let startIndex = 0;
    
    switch(ticketPeriod) {
      case '1':
        startIndex = totalMonths - 1;
        break;
      case '3':
        startIndex = Math.max(0, totalMonths - 3);
        break;
      case '6':
        startIndex = Math.max(0, totalMonths - 6);
        break;
      case '12':
      default:
        startIndex = 0;
        break;
    }
    
    return ticketMedioChart.slice(startIndex);
  }, [ticketMedioChart, ticketPeriod])

  const ticketMedioAverage = useMemo(() => {
    const totalRevenue = filteredTicketChart.reduce((sum, item) => sum + (item.ticketMedio * item.sessoes), 0);
    const totalSessions = filteredTicketChart.reduce((sum, item) => sum + item.sessoes, 0);
    return totalSessions > 0 ? totalRevenue / totalSessions : 0;
  }, [filteredTicketChart])

  const stats = [
    {
      title: "Sessões Hoje",
      value: dashboardData.sessionsToday.toString(),
      change: "+2 vs ontem",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Clientes Ativos",
      value: dashboardData.activeClients.toString(),
      change: "+5 este mês",
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Receita Mensal",
      value: formatCurrencyBR(dashboardData.monthlyRevenue),
      change: "+15% vs mês anterior",
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Taxa de Conclusão",
      value: `${dashboardData.completionRate}%`,
      change: "+3% este mês",
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10"
    }
  ]

  return (
    <Layout>
      <NotificationPermissionBanner />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta! Aqui está um resumo do seu dia.
            </p>
          </div>
          <TutorialButton onClick={handleOpenTutorial} />
        </div>

        {/* Actionable Notifications Banner */}
        <ActionableNotificationsBanner />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-full ${
                  index === 0 ? 'bg-primary' : 
                  index === 1 ? 'bg-success' : 
                  index === 2 ? 'bg-success' : 
                  'bg-warning'
                } flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))
        )}
        </div>

        {/* Pacotes, Pagamentos e Notificações Inteligentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="shadow-soft">
                  <CardHeader>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <PackageStatusCard stats={packageStats} />
              <PaymentStatusCard stats={paymentStats} />
              <SmartNotificationCard notifications={smartNotifications} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Próximas Sessões */}
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Próximas Sessões
                  </CardTitle>
                  <CardDescription>
                    Suas consultas agendadas para hoje
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
                  Ver Agenda <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent 
              className={`transition-all duration-300 ${
                upcomingSessions.length === 0 
                  ? 'min-h-[120px]' 
                  : upcomingSessions.length <= 2 
                    ? 'min-h-[200px]' 
                    : upcomingSessions.length <= 4 
                      ? 'min-h-[350px]' 
                      : 'min-h-[450px]'
              }`}
            >
              <div className="space-y-4">
                {isLoading ? (
                  // Skeleton for upcoming sessions
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))
                 ) : upcomingSessions.length > 0 ? upcomingSessions.slice(0, 4).map((session, index) => {
                   // Verificar se a sessão precisa de atenção
                   const needsAttention = session.status === 'agendada' && new Date(`${session.data}T${session.horario}`) < new Date()
                   
                   return (
                   <div 
                     key={session.id || index} 
                     className={`flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${needsAttention ? 'animate-attention-pulse border-warning' : ''}`}
                     onClick={() => navigate(`/agenda?highlight=${session.id}&date=${session.data}`)}
                   >
                      <div className="flex items-center gap-4">
                        <ClientAvatar 
                          avatarPath={session.clients?.avatar_url}
                          clientName={session.clients?.nome || 'Cliente'}
                          size="lg"
                        />
                        <div>
                          <p className="font-medium">{session.clients?.nome || 'Cliente'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeBR(session.horario)}
                          </p>
                          <p className="text-sm font-medium text-success">
                            {formatCurrencyBR(session.valor || 0)}
                          </p>
                       </div>
                     </div>
                       <div className="text-right">
                          <p className="font-medium">{formatDateBR(session.data)}</p>
                         <Badge 
                           variant={
                             session.status === 'realizada' ? 'success' :
                             session.status === 'agendada' ? 'info' :
                             session.status === 'cancelada' ? 'destructive' :
                             session.status === 'falta' ? 'warning' :
                             'info'
                           }
                           className="text-xs"
                         >
                           {session.status === 'realizada' ? 'Realizada' :
                            session.status === 'agendada' ? 'Agendada' :
                            session.status === 'cancelada' ? 'Cancelada' :
                            session.status === 'falta' ? 'Falta' :
                            'Agendada'}
                         </Badge>
                        </div>
                    </div>
                   )
                 }) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">Nenhuma sessão agendada</p>
                  </div>
                )}
                {upcomingSessions.length > 4 && (
                  <div className="pt-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-primary hover:text-primary/80"
                      onClick={() => navigate("/agenda")}
                    >
                      Ver todas as sessões ({upcomingSessions.length})
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos Recentes */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-success" />
                Pagamentos Recentes
              </CardTitle>
              <CardDescription>
                Últimas transações
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    // Skeleton for recent payments
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    ))
                  ) : recentPayments.length > 0 ? recentPayments.slice(0, 4).map((payment, index) => {
                    // Determinar status baseado na data E hora da sessão
                    const sessionDateTime = new Date(`${payment.data}T${payment.horario}`)
                    const currentDateTime = new Date()
                    
                    // Status correto: se status da sessão é 'realizada', então está pago, caso contrário pendente
                    let displayStatus: string
                    if (payment.status === 'realizada') {
                      displayStatus = 'pago'
                    } else {
                      displayStatus = 'pendente'
                    }

      const getStatusColor = (status: string) => {
        switch (status) {
          case 'pago': return 'success'
          case 'pendente': return 'warning'
          default: return 'warning'
        }
      }
                    
                    return (
                      <div 
                        key={payment.id || index} 
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">{payment.clients?.nome || 'Cliente'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateBR(payment.data)} às {formatTimeBR(payment.horario)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrencyBR(payment.valor)}</p>
                          <Badge 
                            variant={getStatusColor(displayStatus)}
                            className="text-xs"
                          >
                            {displayStatus === 'pago' ? 'Pago' : 'Pendente'}
                          </Badge>
                       </div>
                    </div>
                    )
                  }) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
                )}
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm" onClick={() => navigate("/pagamentos")}>
                Ver Todos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas e Upgrade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ações Rápidas */}
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesse rapidamente as funcionalidades mais utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={handleNewSession}>
                    <Calendar className="w-6 h-6 text-primary" />
                    <span>Agendar Sessão</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={handleNewClient}>
                    <Users className="w-6 h-6 text-success" />
                    <span>Adicionar Cliente</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={handleNewPayment}>
                    <DollarSign className="w-6 h-6 text-success" />
                    <span>Registrar Pagamento</span>
                  </Button>
                </div>

                {/* Gráfico Financeiro Expandido */}
                <div className="col-span-full">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          <CardTitle>Receita Financeira</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant={chartPeriod === '1' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('1')}
                          >
                            1 mês
                          </Button>
                          <Button 
                            variant={chartPeriod === '3' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('3')}
                          >
                            3 meses
                          </Button>
                          <Button 
                            variant={chartPeriod === '6' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('6')}
                          >
                            6 meses
                          </Button>
                          <Button 
                            variant={chartPeriod === '12' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('12')}
                          >
                            1 ano
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Acompanhe sua evolução financeira nos últimos {chartPeriod} meses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                               data={filteredMonthlyChart}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                             <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                             <XAxis 
                               dataKey="mes" 
                               tick={{ fontSize: 12 }} 
                               tickLine={false}
                               axisLine={false}
                             />
                             <YAxis 
                               tick={{ fontSize: 12 }}
                               tickLine={false}
                               axisLine={false}
                               tickFormatter={(value) => formatCurrencyBR(value)}
                             />
                              <Tooltip 
                                formatter={(value: any, name: string) => {
                                  if (name === 'receita') return [formatCurrencyBR(value), 'Receita']
                                  if (name === 'aReceber') return [formatCurrencyBR(value), 'A Receber']
                                  return [formatCurrencyBR(value), name]
                                }}
                                labelFormatter={(label) => {
                                  const month = monthlyChart.find(item => item.mes === label);
                                  return month ? month.fullMonth : label;
                                }}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                              <Bar 
                                dataKey="receita" 
                                fill="hsl(var(--primary))" 
                                radius={[4, 4, 0, 0]}
                                className="hover:opacity-80 transition-opacity"
                              />
                              <Bar 
                                dataKey="aReceber" 
                                fill="hsl(var(--destructive))" 
                                radius={[4, 4, 0, 0]}
                                className="hover:opacity-80 transition-opacity"
                              />
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                      
                        {/* Estatísticas do período */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                           <div className="text-center">
                             <p className="text-2xl font-bold text-primary">
                               {(() => {
                                 const totalMonths = monthlyChart.length;
                                 let startIndex = 0;
                                 
                                 switch(chartPeriod) {
                                   case '1':
                                     startIndex = totalMonths - 1;
                                     break;
                                   case '3':
                                     startIndex = Math.max(0, totalMonths - 3);
                                     break;
                                   case '6':
                                     startIndex = Math.max(0, totalMonths - 6);
                                     break;
                                   case '12':
                                   default:
                                     startIndex = 0;
                                     break;
                                 }
                                 
                                 const filteredData = monthlyChart.slice(startIndex);
                                 return formatCurrencyBR(filteredData.reduce((sum, item) => sum + item.receita, 0));
                               })()}
                             </p>
                             <p className="text-sm text-muted-foreground">Total Recebido</p>
                           </div>
                           <div className="text-center">
                             <p className="text-2xl font-bold text-destructive">
                               {(() => {
                                 const totalMonths = monthlyChart.length;
                                 let startIndex = 0;
                                 
                                 switch(chartPeriod) {
                                   case '1':
                                     startIndex = totalMonths - 1;
                                     break;
                                   case '3':
                                     startIndex = Math.max(0, totalMonths - 3);
                                     break;
                                   case '6':
                                     startIndex = Math.max(0, totalMonths - 6);
                                     break;
                                   case '12':
                                   default:
                                     startIndex = 0;
                                     break;
                                 }
                                 
                                 const filteredData = monthlyChart.slice(startIndex);
                                 return formatCurrencyBR(filteredData.reduce((sum, item) => sum + (item.aReceber || 0), 0));
                               })()}
                             </p>
                             <p className="text-sm text-muted-foreground">A Receber</p>
                           </div>
                           <div className="text-center">
                             <p className="text-2xl font-bold text-success">
                               {(() => {
                                 const totalMonths = monthlyChart.length;
                                 let startIndex = 0;
                                 
                                 switch(chartPeriod) {
                                   case '1':
                                     startIndex = totalMonths - 1;
                                     break;
                                   case '3':
                                     startIndex = Math.max(0, totalMonths - 3);
                                     break;
                                   case '6':
                                     startIndex = Math.max(0, totalMonths - 6);
                                     break;
                                   case '12':
                                   default:
                                     startIndex = 0;
                                     break;
                                 }
                                 
                                 const filteredData = monthlyChart.slice(startIndex);
                                 return formatCurrencyBR(filteredData.length > 0 ? (filteredData.reduce((sum, item) => sum + item.receita, 0) / filteredData.length) : 0);
                               })()}
                             </p>
                             <p className="text-sm text-muted-foreground">Média Mensal</p>
                           </div>
                        </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Ticket Médio */}
                <div className="col-span-full">
                  <Card className="shadow-soft">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-success" />
                          <CardTitle>Ticket Médio</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant={ticketPeriod === '1' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('1')}
                          >
                            1 mês
                          </Button>
                          <Button 
                            variant={ticketPeriod === '3' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('3')}
                          >
                            3 meses
                          </Button>
                          <Button 
                            variant={ticketPeriod === '6' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('6')}
                          >
                            6 meses
                          </Button>
                          <Button 
                            variant={ticketPeriod === '12' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('12')}
                          >
                            1 ano
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Ticket médio por sessão ao longo do tempo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              key={`ticket-${ticketPeriod}-independent`}
                              data={filteredTicketChart}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                             <XAxis 
                               dataKey="mes" 
                               tick={{ fontSize: 12 }} 
                               tickLine={false}
                               axisLine={false}
                             />
                             <YAxis 
                               tick={{ fontSize: 12 }}
                               tickLine={false}
                               axisLine={false}
                               tickFormatter={(value) => formatCurrencyBR(value)}
                             />
                             <Tooltip 
                               formatter={(value: any) => [formatCurrencyBR(value), 'Ticket Médio']}
                               labelFormatter={(label) => {
                                 const month = ticketMedioChart.find(item => item.mes === label);
                                 return month ? month.fullMonth : label;
                               }}
                               contentStyle={{
                                 backgroundColor: 'hsl(var(--background))',
                                 border: '1px solid hsl(var(--border))',
                                 borderRadius: '6px'
                               }}
                             />
                              <Line 
                                type="monotone" 
                                dataKey="ticketMedio" 
                                stroke="hsl(var(--success))"
                                strokeWidth={3}
                                dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: 'hsl(var(--success))', strokeWidth: 2 }}
                              />
                           </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Estatística do ticket médio atual */}
                      <div className="mt-6 pt-6 border-t text-center">
                        <p className="text-3xl font-bold text-success">
                          {formatCurrencyBR(ticketMedioAverage)}
                        </p>
                        <p className="text-sm text-muted-foreground">Ticket Médio do Período</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Ticket Médio por Cliente - Gráfico de Barras Horizontais */}
                <div className="col-span-full">
                  <Card className="shadow-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-success" />
                        Ticket Médio por Cliente
                      </CardTitle>
                      <CardDescription>
                        Valor médio por sessão de cada cliente
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-muted hover:scrollbar-thumb-primary/30 transition-colors">
                        <div className="space-y-3 pr-2">
                          {clientTicketMedio.length > 0 ? clientTicketMedio.map((client, index) => {
                            const maxTicket = Math.max(...clientTicketMedio.map(c => c.ticketMedio))
                            const widthPercent = maxTicket > 0 ? (client.ticketMedio / maxTicket) * 100 : 0
                            
                            return (
                              <div key={client.clientId} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-medium truncate flex-1 mr-2">
                                    {client.nome}
                                  </p>
                  <p className="text-sm font-bold text-success whitespace-nowrap">
                    {formatCurrencyBR(client.ticketMedio)}
                  </p>
                                </div>
                                <div className="relative">
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-gradient-success h-2 rounded-full transition-all duration-500" 
                                      style={{ width: `${widthPercent}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {client.sessoes} sessões
                                  </p>
                                </div>
                              </div>
                            )
                          }) : (
                            <div className="text-center py-8">
                              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">Nenhum cliente com sessões realizadas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Pizza - Receita por Canal de Pagamento */}
                <div className="col-span-full">
                  <Card className="shadow-soft h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <CardTitle>Receita por Canal</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant={canalPeriod === '1' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('1')}
                          >
                            1 mês
                          </Button>
                          <Button 
                            variant={canalPeriod === '3' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('3')}
                          >
                            3 meses
                          </Button>
                          <Button 
                            variant={canalPeriod === '6' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('6')}
                          >
                            6 meses
                          </Button>
                          <Button 
                            variant={canalPeriod === '12' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('12')}
                          >
                            1 ano
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Distribuição da receita por método de pagamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px] px-4 pt-4 pb-2">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        {/* Gráfico de Pizza */}
                        <div className="h-full min-h-[240px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={receitaPorCanal}
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={30}
                                paddingAngle={5}
                                dataKey="valor"
                              >
                                {receitaPorCanal.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: any) => [formatCurrencyBR(value), 'Receita']}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Lista de Canais */}
                        <div className="space-y-2 flex flex-col justify-center">
                          {receitaPorCanal.length > 0 ? receitaPorCanal.map((canal, index) => {
                            const total = receitaPorCanal.reduce((sum, item) => sum + item.valor, 0)
                            const percentage = total > 0 ? ((canal.valor / total) * 100).toFixed(1) : '0'
                            
                            return (
                              <div key={canal.canal} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: canal.color }}
                                  />
                                  <span className="font-medium text-sm">{canal.canal}</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-primary text-sm">{formatCurrencyBR(canal.valor)}</p>
                                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                                </div>
                              </div>
                            )
                          }) : (
                            <div className="text-center py-8">
                              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">Nenhum pagamento registrado no período</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coluna da Direita */}
          <div className="space-y-6 flex flex-col h-full">
            {/* Upgrade de Plano */}
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <UpgradePlanCard currentPlan={currentPlan} />
              </CardContent>
            </Card>

            {/* Top 5 Clientes que Mais Pagam */}
            <Card className="shadow-soft flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Top 5 Clientes
                </CardTitle>
                <CardDescription>
                  Clientes que mais geraram receita
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="space-y-4">
                  {topClients.length > 0 ? topClients.map((client, index) => (
                    <div key={client.clientId} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors relative">
                      {/* Coroa dourada animada para o primeiro cliente */}
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Crown 
                            className="w-6 h-6 text-yellow-500 animate-crown-glow"
                            fill="currentColor"
                            style={{
                              filter: 'drop-shadow(0 0 8px gold)'
                            }}
                          />
                        </div>
                      )}
                      
                      <ClientAvatar 
                        avatarPath={client.avatar_url}
                        clientName={client.nome}
                        size="lg"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.sessoes} sessões
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrencyBR(client.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrencyBR(client.ticketMedio)} médio
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum cliente com pagamentos ainda</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Clientes Recentes */}
            <Card className="shadow-soft flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" />
                  Clientes Recentes
                </CardTitle>
                <CardDescription>
                  Últimos clientes adicionados
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="space-y-3">
                  {recentClients.length > 0 ? recentClients.slice(0, 5).map((client, index) => (
                    <div key={client.id || index} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    <ClientAvatar 
                      avatarPath={client.avatar_url}
                      clientName={client.nome}
                      size="md"
                    />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateBR(client.created_at)}
                        </p>
                        {client.telefone && (
                          <p className="text-xs text-muted-foreground truncate">{client.telefone}</p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum cliente adicionado ainda</p>
                      <Button variant="outline" className="mt-2" onClick={() => navigate("/clientes")}>
                        Adicionar Cliente
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alertas */}
        <Card className="shadow-soft border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              Lembretes Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dynamicReminders.map((reminder, index) => (
                <p key={index} className="text-sm">• {reminder}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <NewClientModal
        open={isNewClientOpen}
        onOpenChange={setIsNewClientOpen}
        onClientAdded={loadDashboardData}
      />
      <NewPaymentModal
        open={isNewPaymentOpen}
        onOpenChange={setIsNewPaymentOpen}
        onPaymentAdded={loadDashboardData}
      />
      <TutorialModal
        open={isTutorialOpen}
        onOpenChange={setIsTutorialOpen}
      />
    </Layout>
  )
}

export default Dashboard