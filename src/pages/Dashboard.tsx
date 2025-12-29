import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ClientAvatar } from "@/components/ClientAvatar"
import { PackageStatusCard } from "@/components/PackageStatusCard"
import { BusinessOrbitalView } from "@/components/BusinessOrbitalView"
import { SmartNotificationCard } from "@/components/SmartNotificationCard"
import { PulsingDot } from "@/components/ui/pulsing-dot"
import { DashboardFooter } from "@/components/DashboardFooter"
import { ScrollAnimation } from "@/hooks/useScrollAnimation"
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
  Crown,
  Loader2,
  Pill,
  Baby,
  Package,
  Repeat,
  PenLine,
  FileText
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, PieChart, Pie, Cell, ReferenceLine, RadialBarChart, RadialBar, Legend, PolarAngleAxis } from 'recharts'
import { Layout } from "@/components/Layout"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { useTerminology } from "@/hooks/useTerminology"
import { NewClientModal } from "@/components/NewClientModal"
import { NewPaymentModal } from "@/components/NewPaymentModal"
import { UpgradePlanCard } from "@/components/UpgradePlanCard"
import { ActionableNotificationsBanner } from "@/components/ActionableNotificationsBanner"
import { TutorialButton } from "@/components/TutorialButton"
import { TutorialModal } from "@/components/TutorialModal"
import { formatCurrencyBR, formatTimeBR, formatDateBR, formatPaymentMethod } from "@/utils/formatters"
import { cn } from "@/lib/utils"
import { getPaymentEffectiveDate, isOverdue } from "@/utils/sessionStatusUtils"
import { toast } from "sonner"
import { useGlobalRealtime } from "@/hooks/useGlobalRealtime"
import { GoogleSyncBadge } from "@/components/google/GoogleSyncBadge"

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentPlan } = useSubscription()
  const { clientTerm, clientTermPlural } = useTerminology()
  const { subscribe } = useGlobalRealtime()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
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
  const [renderedCanalPeriod, setRenderedCanalPeriod] = useState<'1' | '3' | '6' | '12'>('12')
  const [hoveredCanalIndex, setHoveredCanalIndex] = useState<number | null>(null)
  const [canalDataCache, setCanalDataCache] = useState<any[]>([])
  const [showReceitaAverage, setShowReceitaAverage] = useState(true)
  const [showTicketAverage, setShowTicketAverage] = useState(true)
  const [chartsAnimated, setChartsAnimated] = useState(false)
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
  const [sessionNotes, setSessionNotes] = useState<any[]>([])
  const [evolucoes, setEvolucoes] = useState<any[]>([])
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
    // Ativar animações após mount
    const timer = setTimeout(() => setChartsAnimated(true), 100)
    return () => {
      isActiveRef.current = false
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    console.log('🎯 useEffect principal disparado, user:', user?.id)
    if (user && isActiveRef.current) {
      console.log('👤 Usuário encontrado, carregando dados...')
      loadDashboardDataOptimized(true)
    }
    
    // Check if returning from successful payment
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success' && user) {
      handlePaymentSuccess()
    }
  }, [user, loadDashboardDataOptimized, searchParams])

  const handlePaymentSuccess = async () => {
    console.log('[Dashboard] 🔄 Payment success detected, syncing subscription...')
    
    // Keep dashboard in loading state until subscription is synced
    setIsLoading(true)
    setIsProcessingPayment(true)
    
    let attempts = 0
    const maxAttempts = 10
    
    const syncAndCheckStatus = async (): Promise<boolean> => {
      try {
        attempts++
        console.log(`[Dashboard] Attempt ${attempts}/${maxAttempts}: Calling check-subscription...`)
        const { data, error } = await supabase.functions.invoke('check-subscription')
        
        if (error) {
          console.error('[Dashboard] check-subscription error:', error)
          return false
        }
        
        console.log('[Dashboard] check-subscription response:', data)
        
        // check-subscription now returns subscription_tier and updates DB
        if (data?.subscription_tier && data.subscription_tier !== 'basico') {
          console.log('[Dashboard] ✅ Subscription synced successfully:', data.subscription_tier)
          
          // Clear URL params before reload
          searchParams.delete('payment')
          setSearchParams(searchParams, { replace: true })
          
          // Small delay then reload to get fresh data with new plan
          await new Promise(resolve => setTimeout(resolve, 500))
          window.location.href = '/dashboard'
          return true
        }
        
        console.log('[Dashboard] Subscription not yet active, will retry...')
        return false
      } catch (error) {
        console.error('[Dashboard] Error syncing subscription:', error)
        return false
      }
    }
    
    // Initial delay to allow Stripe to process
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Poll with increasing intervals
    const poll = async () => {
      const processed = await syncAndCheckStatus()
      
      if (processed) {
        return // Success - page will reload
      }
      
      if (attempts >= maxAttempts) {
        // Max attempts reached - give up gracefully
        setIsLoading(false)
        setIsProcessingPayment(false)
        searchParams.delete('payment')
        setSearchParams(searchParams, { replace: true })
        toast.success('Plano atualizado! Carregando dados...')
        loadDashboardDataOptimized(true)
        return
      }
      
      // Wait and try again
      await new Promise(resolve => setTimeout(resolve, 2000))
      await poll()
    }
    
    await poll()
  }

  // Sempre recarregar quando o Dashboard é montado (volta de outra página)
  useEffect(() => {
    if (user && isActiveRef.current) {
      console.log('🔄 Dashboard montado, forçando atualização e limpando caches legados...')
      // Limpar caches legados de localStorage
      const keysToRemove = ['canal_1', 'canal_3', 'canal_6', 'canal_12', 'canal_1_time', 'canal_3_time', 'canal_6_time', 'canal_12_time']
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      invalidateCache(['upcomingSessions', 'recentPayments', 'dashboardStats', 'charts'])
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
    const handlePackageAdded = () => handleDataChange(['dashboardStats'])

    window.addEventListener('storage', onStorage)
    window.addEventListener('clientAdded', handleClientAdded)
    window.addEventListener('paymentAdded', handlePaymentAdded)
    window.addEventListener('paymentUpdated', handlePaymentUpdated)
    window.addEventListener('sessionAdded', handleSessionAdded)
    window.addEventListener('sessionUpdated', handleSessionUpdated)
    window.addEventListener('packageAdded', handlePackageAdded)
    window.addEventListener('packageUpdated', handlePackageAdded)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('clientAdded', handleClientAdded)
      window.removeEventListener('paymentAdded', handlePaymentAdded)
      window.removeEventListener('paymentUpdated', handlePaymentUpdated)
      window.removeEventListener('sessionAdded', handleSessionAdded)
      window.removeEventListener('sessionUpdated', handleSessionUpdated)
      window.removeEventListener('packageAdded', handlePackageAdded)
      window.removeEventListener('packageUpdated', handlePackageAdded)
    }
  }, [user, loadDashboardDataOptimized, invalidateCache])

  // Recarregar ao voltar o foco/aba visível
  useEffect(() => {
    if (!user) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidateCache(['upcomingSessions', 'recentPayments', 'recentClients', 'dashboardStats', 'charts'])
        loadDashboardDataOptimized(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [user, invalidateCache, loadDashboardDataOptimized])

  // Usar hook global de realtime ao invés de criar canais separados
  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribe(['sessions', 'clients', 'payments', 'packages'], () => {
      invalidateCache(['upcomingSessions', 'recentPayments', 'dashboardStats', 'charts'])
      loadDashboardDataOptimized(true, ['upcomingSessions', 'recentPayments', 'dashboardStats', 'charts'])
    })

    return unsubscribe
  }, [user, loadDashboardDataOptimized, invalidateCache, subscribe])

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
        upcomingDataResult,
        paymentsDataResult,
        recentClientsDataResult,
        allClientsWithPaymentsResult,
        allPaymentMethodsResult,
        packagesDataResult,
        allSessionsForNotificationsResult,
        pendingPaymentsResult,
        sessionNotesResult,
        evolucoesResult
      ] = await Promise.all([
        // Buscar TODAS as sessões de hoje, sem considerar horário para filtro inicial
        supabase.from('sessions').select('id, data, horario, status, valor, client_id, clients(nome, avatar_url, medicamentos, eh_crianca_adolescente)').eq('user_id', user?.id).eq('data', today).order('horario'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('payments').select('valor, status, data_pagamento, created_at, sessions:session_id(data)').eq('user_id', user?.id).eq('status', 'pago').gte('created_at', `${new Date().toISOString().slice(0, 7)}-01`).lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)),
        // Buscar sessões futuras incluindo hoje
        supabase.from('sessions').select('id, data, horario, status, valor, client_id, package_id, recurring_session_id, google_sync_type, clients(id, nome, avatar_url, medicamentos, eh_crianca_adolescente)').eq('user_id', user?.id).eq('status', 'agendada').gte('data', today).order('data').order('horario').limit(20),
        // Buscar pagamentos recentes da tabela PAYMENTS (não sessions)
        supabase.from('payments').select('id, valor, status, metodo_pagamento, data_pagamento, data_vencimento, created_at, updated_at, session_id, package_id, client_id, clients:client_id(nome, avatar_url, medicamentos, eh_crianca_adolescente), sessions:session_id(data, horario)').eq('user_id', user?.id).order('updated_at', { ascending: false }).limit(10),
        supabase.from('clients').select('id, nome, avatar_url, created_at, telefone, medicamentos, eh_crianca_adolescente').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5),
        // Buscar sessões realizadas para cálculo de ticket médio (contar todas as sessões com status realizada)
        supabase.from('sessions').select('client_id, valor, status, clients(nome, avatar_url, medicamentos, eh_crianca_adolescente)').eq('user_id', user?.id).eq('status', 'realizada').not('client_id', 'is', null),
        supabase.from('payments').select('metodo_pagamento, valor, sessions:session_id(metodo_pagamento)').eq('user_id', user?.id).eq('status', 'pago').not('valor', 'is', null),
        supabase.from('packages').select('id, nome, total_sessoes, sessoes_consumidas, valor_total, status, client_id, data_inicio, data_fim').eq('user_id', user?.id),
        supabase.from('sessions').select('id, status, data, horario').eq('user_id', user?.id).order('data', { ascending: false }).limit(50), // Reduzido de 500 para 50
        supabase.from('payments').select('id, session_id, package_id, valor, status, data_vencimento, data_pagamento, created_at, sessions:session_id(data, horario, status), packages:package_id(data_fim, data_inicio, nome, total_sessoes)').eq('user_id', user?.id),
        // Buscar anotações de sessões
        supabase.from('session_notes').select('session_id').eq('user_id', user?.id),
        // Buscar evoluções
        supabase.from('evolucoes').select('session_id').eq('user_id', user?.id).not('session_id', 'is', null)
      ])
      
      if (checkStale()) return
      
      const todaySessions = todaySessionsResult.data
      const clientsCount = clientsCountResult.count

      const monthlyPayments = monthlyPaymentsResult.data
      const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0

      const nowDate = new Date()
      
      const upcomingData = upcomingDataResult.data
      // Filtrar sessões futuras considerando data E horário
      const filteredUpcoming = upcomingData?.filter(session => {
        // Parse seguro da data/hora
        const [year, month, day] = session.data.split('-').map(Number)
        const [hours, minutes] = session.horario.split(':').map(Number)
        const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0)
        return sessionDateTime > nowDate
      }).slice(0, 4)
      
      const paymentsData = paymentsDataResult.data
      const recentClientsData = recentClientsDataResult.data

      // ✅ OTIMIZAÇÃO: Buscar todos os dados de gráficos com UMA query ao invés de múltiplas
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]
      
      // Buscar todos os pagamentos do último ano (sessões + pacotes)
      const { data: yearPayments } = await supabase
        .from('payments')
        .select('valor, status, data_vencimento, data_pagamento, created_at, session_id, package_id, sessions:session_id(data, horario), packages:package_id(data_fim)')
        .eq('user_id', user?.id)
        .gte('created_at', oneYearAgoStr)
      
      if (checkStale()) return
      
      // Processar dados do gráfico mensal em memória com base em payments
      const chartData: any[] = []
      const ticketMedioData: any[] = []
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        
        const revenue = (yearPayments || [])
          .filter((p: any) => p.status === 'pago')
          .filter((p: any) => {
            const d = p.data_pagamento
              ? new Date(p.data_pagamento)
              : (p.sessions?.data ? new Date(p.sessions.data) : new Date(p.created_at))
            return d >= monthStart && d <= monthEnd
          })
          .reduce((sum: number, p: any) => sum + (p.valor || 0), 0)
        
        const pending = (yearPayments || [])
          .filter((p: any) => p.status === 'pendente')
          .filter((p: any) => {
            const eff = getPaymentEffectiveDate(p)
            return eff >= monthStart && eff <= monthEnd
          })
          .reduce((sum: number, p: any) => sum + (p.valor || 0), 0)
        
        const paidThisMonth = (yearPayments || [])
          .filter((p: any) => p.status === 'pago')
          .filter((p: any) => {
            const d = p.data_pagamento
              ? new Date(p.data_pagamento)
              : (p.sessions?.data ? new Date(p.sessions.data) : new Date(p.created_at))
            return d >= monthStart && d <= monthEnd
          })
        const totalPaidValue = paidThisMonth.reduce((sum: number, p: any) => sum + (p.valor || 0), 0)
        const totalPaidCount = paidThisMonth.length
        const ticketMedio = totalPaidCount > 0 ? totalPaidValue / totalPaidCount : 0
        
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const monthNamesLong = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        
        chartData.push({
          mes: monthNames[date.getMonth()],
          receita: revenue,
          aReceber: pending,
          fullMonth: `${monthNamesLong[date.getMonth()]} ${date.getFullYear()}`
        })
        
        // Calcular min/max dos pagamentos individuais do mês
        const valoresPagamentos = paidThisMonth.map((p: any) => p.valor || 0).filter((v: number) => v > 0)
        const minPagamento = valoresPagamentos.length > 0 ? Math.min(...valoresPagamentos) : 0
        const maxPagamento = valoresPagamentos.length > 0 ? Math.max(...valoresPagamentos) : 0
        
        ticketMedioData.push({
          mes: monthNames[date.getMonth()],
          ticketMedio: ticketMedio,
          sessoes: totalPaidCount,
          fullMonth: `${monthNamesLong[date.getMonth()]} ${date.getFullYear()}`,
          minPagamento,
          maxPagamento,
          totalValor: totalPaidValue
        })
      }
      
      if (checkStale()) return

      const allClientsWithPayments = allClientsWithPaymentsResult.data

      const clientPayments = {}
      allClientsWithPayments?.forEach(session => {
        // Contar TODAS as sessões realizadas, independente de valor
        if (session.client_id && session.clients?.nome) {
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

      const canalPayments: { [key: string]: { valor: number; count: number } } = {}
      allPaymentMethods?.forEach(session => {
        let metodo = session.metodo_pagamento || 'A definir'
        // Consolidar cartao_credito e cartao_debito em cartao
        if (metodo === 'cartao_credito' || metodo === 'cartao_debito') {
          metodo = 'cartao'
        }
        if (!canalPayments[metodo]) {
          canalPayments[metodo] = { valor: 0, count: 0 }
        }
        canalPayments[metodo].valor += Number(session.valor) || 0
        canalPayments[metodo].count += 1
      })

      const canalColors: Record<string, string> = {
        'pix': '#00D09C',
        'cartao': '#6366F1',
        'boleto': '#F59E0B',
        'dinheiro': '#10B981',
        'transferencia': '#8B5CF6',
        'A definir': '#6B7280'
      }

      const receitaPorCanalData = Object.entries(canalPayments)
        .map(([canal, data]: [string, { valor: number; count: number }]) => ({
          canal: formatPaymentMethod(canal),
          valor: data.valor,
          count: data.count,
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

      // Calcular estatísticas de pagamentos usando a tabela PAYMENTS
      const allPaymentsData = pendingPaymentsResult.data || []
      const paidPayments = allPaymentsData.filter(p => p.status === 'pago')
      
      // CRITICAL: Filtrar pendingPayments verificando o status real da sessão
      // Se o pagamento é de sessão, só contar se a sessão ainda está como 'agendada'
      // (o trigger agora sincroniza automaticamente, mas isso garante coerência com dados antigos)
      const pendingPayments = allPaymentsData.filter(p => {
        if (p.status !== 'pendente') return false
        
        // Para pagamentos de sessão, verificar se a sessão ainda está 'agendada'
        if (p.session_id && p.sessions) {
          return p.sessions.status === 'agendada'
        }
        
        // Pagamentos de pacote são sempre válidos se estão pendentes
        return true
      })

      const paymentStatsData = {
        totalPaid: paidPayments.reduce((sum, p) => sum + (p.valor || 0), 0),
        totalPending: pendingPayments.reduce((sum, p) => sum + (p.valor || 0), 0),
        paidCount: paidPayments.length,
        pendingCount: pendingPayments.length
      }

      // Gerar notificações inteligentes
      const notifications: any[] = []

      // Notificação: Sessões passadas que ainda estão como 'agendada' - PRECISAM DE ATENÇÃO (amarelo)
      // Usar allSessionsForNotifications (sem filtro de valor) para verificar todas as sessões
      const allSessionsForNotifications = allSessionsForNotificationsResult.data || []
      const sessionsNeedingAttention = allSessionsForNotifications.filter(s => {
        if (s.status !== 'agendada') return false
        
        // Parse seguro da data/hora
        const [year, month, day] = s.data.split('-').map(Number)
        const [hours, minutes] = s.horario.split(':').map(Number)
        const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0)
        const now = new Date()
        
        return sessionDateTime < now
      })
      if (sessionsNeedingAttention.length > 0) {
        notifications.push({
          id: 'sessions-need-attention',
          type: 'recurring_next' as const,
          priority: 'medium' as const,
          title: 'Atualização de Status Necessária',
          message: `${sessionsNeedingAttention.length} ${sessionsNeedingAttention.length === 1 ? 'sessão precisa' : 'sessões precisam'} que o status seja atualizado`,
          actionUrl: '/sessoes',
          actionLabel: 'Ver',
          metadata: { count: sessionsNeedingAttention.length, sessionIds: sessionsNeedingAttention.map(s => s.id) }
        })
      }

      // Notificação: Pagamentos pendentes (usar tabela payments + isOverdue - vermelho)
      const overduePayments = pendingPayments.filter(p => isOverdue(p))
      
      if (overduePayments.length > 0) {
        const totalAmount = overduePayments.reduce((sum, p) => sum + (p.valor || 0), 0)
        
        notifications.push({
          type: 'payment_overdue',
          priority: 'high',
          title: 'Pagamentos Pendentes',
          message: `${overduePayments.length} ${overduePayments.length === 1 ? 'pagamento' : 'pagamentos'} ${overduePayments.length === 1 ? 'aguardando' : 'aguardando'} confirmação`,
          actionUrl: '/pagamentos',
          actionLabel: 'Ver',
          metadata: {
            amount: totalAmount
          }
        })
      }

      // Gerar lembretes dinâmicos (apenas eventos futuros)
      const reminders = []
      
      // Próximas sessões (apenas futuras)
      if (filteredUpcoming && filteredUpcoming.length > 0) {
        const nextSession = filteredUpcoming[0]
        // Parse seguro da data/hora
        const [year, month, day] = nextSession.data.split('-').map(Number)
        const [hours, minutes] = nextSession.horario.split(':').map(Number)
        const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0)
        const isToday = sessionDateTime.toDateString() === nowDate.toDateString()
        
        if (isToday) {
          reminders.push(`${nextSession.clients?.nome || 'Cliente'} tem consulta às ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} hoje`)
        } else {
          reminders.push(`Próxima consulta: ${nextSession.clients?.nome || 'Cliente'} em ${sessionDateTime.toLocaleDateString('pt-BR')}`)
        }
      }
      
      // Clientes novos - usar terminologia dinâmica
      if (recentClientsData && recentClientsData.length > 0) {
        const newClientsThisWeek = recentClientsData.filter(client => {
          const clientDate = new Date(client.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return clientDate > weekAgo
        }).length
        
        if (newClientsThisWeek > 0) {
          const termToUse = newClientsThisWeek === 1 ? clientTerm.toLowerCase() : clientTermPlural.toLowerCase()
          reminders.push(`${newClientsThisWeek} novo${newClientsThisWeek > 1 ? 's' : ''} ${termToUse} esta semana`)
        }
      }

      if (reminders.length === 0) {
        reminders.push('Nenhum lembrete importante no momento')
      }

      if (checkStale()) return

      // Calcular taxa de conclusão baseado em sessões realizadas  
      const allSessionsData = allSessionsForNotificationsResult.data || []
      const totalSessionsCount = allSessionsData.length
      const completedSessionsCount = allSessionsData.filter(s => s.status === 'realizada').length
      const calculatedCompletionRate = totalSessionsCount > 0 
        ? Math.round((completedSessionsCount / totalSessionsCount) * 100)
        : 0

      // Preparar dashboard data (não setar ainda)
      const dashboardDataPrepared = {
        sessionsToday: todaySessions?.length || 0,
        activeClients: clientsCount || 0,
        monthlyRevenue,
        pendingRevenue: pendingPayments.reduce((sum, p) => sum + (p.valor || 0), 0),
        completionRate: calculatedCompletionRate
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
      
      // Ordenar pagamentos recentes por updated_at (mais recente primeiro)
      const sortedPayments = (paymentsData || []).slice(0, 5).sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at)
        const dateB = new Date(b.updated_at || b.created_at)
        return dateB.getTime() - dateA.getTime()
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
      setSessionNotes(sessionNotesResult.data || [])
      setEvolucoes(evolucoesResult.data || [])
      
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

  // Load canal data with period filter (usando payments)
  const loadCanalData = useCallback(async (period: '1' | '3' | '6' | '12') => {
    try {
      if (!user) return

      console.log('💳 Carregando dados do canal para período:', period)
      
      // Calculate date range based on period
      const currentDate = new Date()
      const startDate = new Date()
      const monthsToSubtract = parseInt(period)
      startDate.setMonth(currentDate.getMonth() - monthsToSubtract)

      // Buscar pagamentos (ao invés de sessions)
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('metodo_pagamento, valor, sessions:session_id(metodo_pagamento), data_pagamento, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pago')
        .gte('created_at', startDate.toISOString().split('T')[0])
        .not('valor', 'is', null)

      if (error) throw error

      const canalData: { [key: string]: { valor: number; count: number } } = {}
      
      paymentsData?.forEach((p) => {
        let method = p.metodo_pagamento || p.sessions?.metodo_pagamento || 'Outros'
        // Consolidar cartao_credito e cartao_debito em cartao
        if (method === 'cartao_credito' || method === 'cartao_debito') {
          method = 'cartao'
        }
        if (!canalData[method]) {
          canalData[method] = { valor: 0, count: 0 }
        }
        canalData[method].valor += p.valor || 0
        canalData[method].count += 1
      })

      const canalColors: Record<string, string> = {
        'pix': '#00D09C',
        'cartao': '#6366F1',
        'boleto': '#F59E0B',
        'dinheiro': '#10B981',
        'transferencia': '#8B5CF6',
        'A definir': '#6B7280',
        'Outros': '#6B7280'
      }

      const filteredCanalData = Object.entries(canalData)
        .map(([canal, data]: [string, { valor: number; count: number }]) => ({
          canal: formatPaymentMethod(canal),
          valor: data.valor,
          count: data.count,
          color: canalColors[canal as keyof typeof canalColors] || '#6B7280'
        }))
        .sort((a, b) => b.valor - a.valor)

      console.log('💳 Dados filtrados processados:', filteredCanalData)
      setReceitaPorCanal(filteredCanalData)
      setRenderedCanalPeriod(period) // Atualiza DEPOIS dos dados para garantir animação

    } catch (error) {
      console.error('Erro ao carregar dados do canal:', error)
    }
  }, [user])

  const handleCanalPeriodChange = useCallback(async (period: '1' | '3' | '6' | '12') => {
    console.log('💳 Mudando período dos canais para:', period)
    setCanalPeriod(period)
    await loadCanalData(period)
  }, [loadCanalData])

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
      title: `${clientTermPlural} Ativos`,
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
      <div className="space-y-4 md:space-y-8 pb-0">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs md:text-base text-muted-foreground">
              Resumo do seu dia
            </p>
          </div>
          <TutorialButton onClick={handleOpenTutorial} />
        </div>

        {/* Actionable Notifications Banner */}
        <ActionableNotificationsBanner />

        {/* Stats Cards - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <Skeleton className="h-3 md:h-4 w-16 md:w-24" />
                <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-full" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <Skeleton className="h-6 md:h-8 w-16 md:w-20 mb-1 md:mb-2" />
                <Skeleton className="h-2 md:h-3 w-20 md:w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => (
            <Card 
              key={index} 
              className="shadow-soft hover:shadow-medium transition-shadow opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${
                  index === 0 ? 'bg-primary' : 
                  index === 1 ? 'bg-success' : 
                  index === 2 ? 'bg-success' : 
                  'bg-warning'
                } flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold truncate">{stat.value}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.change}</p>
              </CardContent>
            </Card>
          ))
        )}
        </div>

        {/* Visão Geral do Negócio - Vertical on mobile */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="shadow-soft">
                  <CardHeader className="p-3 md:p-6">
                    <Skeleton className="h-5 md:h-6 w-32 md:w-40 mb-1 md:mb-2" />
                    <Skeleton className="h-3 md:h-4 w-24 md:w-32" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <Skeleton className="h-16 md:h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <div className="opacity-0 animate-scale-fade-in h-full" style={{ animationDelay: '150ms' }}>
                <PackageStatusCard stats={packageStats} />
              </div>
              <div className="opacity-0 animate-scale-fade-in h-full" style={{ animationDelay: '225ms' }}>
                <BusinessOrbitalView 
                  dashboardData={dashboardData}
                  packageStats={packageStats}
                  upcomingSessionsCount={upcomingSessions.length}
                />
              </div>
                <div className="opacity-0 animate-scale-fade-in h-full" style={{ animationDelay: '300ms' }}>
                  <SmartNotificationCard 
                    notifications={smartNotifications} 
                    reminders={dynamicReminders}
                  />
                </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          {/* Próximas Sessões */}
          <Card className="lg:col-span-2 shadow-soft opacity-0 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                    Próximas Sessões
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    <span className="hidden sm:inline">| </span>Consultas agendadas para hoje
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/agenda")} className="shrink-0 text-xs md:text-sm px-2 md:px-4">
                  <span className="hidden sm:inline">Ver Agenda</span>
                  <span className="sm:hidden">Ver</span>
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="space-y-3 md:space-y-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-3 md:p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-2 md:gap-4">
                        <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full" />
                        <div className="space-y-1 md:space-y-2">
                          <Skeleton className="h-3 md:h-4 w-24 md:w-32" />
                          <Skeleton className="h-2 md:h-3 w-16 md:w-20" />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Skeleton className="h-3 md:h-4 w-16 md:w-24" />
                        <Skeleton className="h-4 md:h-5 w-14 md:w-20" />
                      </div>
                    </div>
                  ))
                 ) : upcomingSessions.length > 0 ? upcomingSessions.slice(0, 4).map((session, index) => {
                   const needsAttention = session.status === 'agendada' && new Date(`${session.data}T${session.horario}`) < new Date()
                   
                   return (
                   <Card 
                     key={session.id || index} 
                     className={cn(
                       "p-2 md:p-4 hover:shadow-md transition-all cursor-pointer relative",
                       needsAttention && "border-warning/30"
                     )}
                     onClick={() => navigate('/sessoes')}
                   >
                     {needsAttention && (
                       <div className="absolute top-2 left-2 md:top-3 md:left-3">
                         <PulsingDot color="warning" size="sm" />
                       </div>
                     )}
                      <div className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                           <ClientAvatar 
                             avatarPath={session.clients?.avatar_url}
                             clientName={session.clients?.nome || 'Cliente'}
                             size="md"
                           />
                           <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 md:gap-2">
                                <p className="font-medium text-sm md:text-base truncate">{session.clients?.nome || 'Cliente'}</p>
                                <TooltipProvider>
                                  {session.clients?.medicamentos && session.clients.medicamentos.length > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Pill className="w-3 h-3 md:w-4 md:h-4 text-blue-500 shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Faz uso de medicamentos</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {session.clients?.eh_crianca_adolescente && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Baby className="w-3 h-3 md:w-4 md:h-4 text-pink-500 shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Criança/Adolescente</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </TooltipProvider>
                              </div>
                             <p className="text-xs md:text-sm text-muted-foreground">
                               {formatTimeBR(session.horario)}
                             </p>
                             <p className="text-xs md:text-sm font-medium text-success">
                               {formatCurrencyBR(session.valor || 0)}
                             </p>
                        </div>
                      </div>
                       <div className="text-right shrink-0">
                          <p className="font-medium text-xs md:text-sm">{formatDateBR(session.data)}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 flex-wrap">
                            <TooltipProvider>
                              {evolucoes.some(evo => evo.session_id === session.id) && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <FileText className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Possui prontuário</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {sessionNotes.some(note => note.session_id === session.id) && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <PenLine className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Possui anotação</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {session.package_id && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Package className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Sessão de pacote</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                            <Badge
                              variant={
                                session.status === 'realizada' ? 'success' :
                                session.status === 'agendada' ? 'info' :
                                session.status === 'cancelada' ? 'destructive' :
                                session.status === 'falta' ? 'warning' :
                                'info'
                              }
                              className="text-[10px] md:text-xs"
                            >
                              {session.status === 'realizada' ? 'Realizada' :
                               session.status === 'agendada' ? 'Agendada' :
                               session.status === 'cancelada' ? 'Cancelada' :
                               session.status === 'falta' ? 'Falta' :
                               'Agendada'}
                            </Badge>
                          </div>
                        </div>
                    </div>
                   </Card>
                   )
                 }) : (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground text-center text-sm">Nenhuma sessão agendada</p>
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
          <Card className="shadow-soft opacity-0 animate-fade-in-up" style={{ animationDelay: '425ms' }}>
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
                  ) : recentPayments.length > 0 ? recentPayments.slice(0, 5).map((payment, index) => {
                    // Status vem diretamente da tabela payments agora
                    const displayStatus = payment.status || 'pendente'
                    
                    // Data/hora vem de sessions (se for pagamento de sessão) ou da data do pagamento
                    const paymentDate = payment.sessions?.data || payment.data_pagamento || payment.created_at?.split('T')[0]
                    const paymentTime = payment.sessions?.horario || null

      const getStatusColor = (status: string) => {
        switch (status) {
          case 'pago': return 'success'
          case 'pendente': return 'warning'
          case 'cancelado': return 'destructive'
          default: return 'warning'
        }
      }

      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'pago': return 'Pago'
          case 'pendente': return 'Pendente'
          case 'cancelado': return 'Cancelado'
          default: return status
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
                            {paymentDate ? formatDateBR(paymentDate) : 'Sem data'}
                            {paymentTime ? ` às ${formatTimeBR(paymentTime)}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrencyBR(payment.valor)}</p>
                          <Badge 
                            variant={getStatusColor(displayStatus)}
                            className="text-xs"
                          >
                            {getStatusLabel(displayStatus)}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Ações Rápidas */}
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader className="pb-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription className="hidden sm:block sm:ml-2">
                    | Acesse rapidamente as funcionalidades mais utilizadas
                  </CardDescription>
                </div>
                <CardDescription className="sm:hidden">
                  Acesse rapidamente as funcionalidades mais utilizadas
                </CardDescription>
              </div>
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
                    <span>Adicionar {clientTerm}</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={handleNewPayment}>
                    <DollarSign className="w-6 h-6 text-success" />
                    <span>Registrar Pagamento</span>
                  </Button>
                </div>

                <ScrollAnimation animation="fade-up" delay={100} className="col-span-full">
                  <Card className="shadow-soft overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <CardTitle>Receita Financeira</CardTitle>
                            <CardDescription className="hidden sm:block sm:ml-2">
                              | Acompanhe sua evolução financeira
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            {(['1', '3', '6', '12'] as const).map((period) => (
                              <button
                                key={period}
                                onClick={() => handlePeriodChange(period)}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200",
                                  chartPeriod === period
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {period === '12' ? '1 ano' : `${period}m`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <CardDescription className="sm:hidden">
                          Acompanhe sua evolução financeira
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Métricas resumidas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrencyBR(filteredMonthlyChart.reduce((sum, item) => sum + item.receita, 0))}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl p-3 border border-destructive/20">
                          <p className="text-xs text-muted-foreground mb-1">A Receber</p>
                          <p className="text-lg font-bold text-destructive">
                            {formatCurrencyBR(filteredMonthlyChart.reduce((sum, item) => sum + (item.aReceber || 0), 0))}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Média Mensal</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrencyBR(filteredMonthlyChart.length > 0 ? (filteredMonthlyChart.reduce((sum, item) => sum + item.receita, 0) / filteredMonthlyChart.length) : 0)}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Meses</p>
                          <p className="text-lg font-bold text-foreground">
                            {filteredMonthlyChart.length}
                          </p>
                        </div>
                      </div>
                      
                      {/* Gráfico de Barras */}
                      <div className="h-72 -mx-2">
                        <ResponsiveContainer key={`revenue-chart-${chartPeriod}`} width="100%" height="100%">
                          <BarChart 
                            data={filteredMonthlyChart}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            barGap={2}
                            barCategoryGap="15%"
                          >
                            <defs>
                              <linearGradient id="receitaBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                              </linearGradient>
                              <linearGradient id="aReceberBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={1}/>
                                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.6}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              vertical={false}
                              stroke="hsl(var(--border))"
                              strokeOpacity={0.5}
                            />
                            <XAxis 
                              dataKey="mes" 
                              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                              tickLine={false}
                              axisLine={false}
                              dy={8}
                            />
                            <YAxis 
                              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `R$${(value/1).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                              width={60}
                            />
                            <RechartsTooltip 
                              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-popover border border-border shadow-lg rounded-lg p-3 min-w-[180px]">
                                      <p className="text-sm font-semibold text-foreground mb-2">{data.fullMonth}</p>
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-sm bg-primary" />
                                            Recebido
                                          </span>
                                          <span className="text-sm font-bold text-primary">{formatCurrencyBR(data.receita)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-sm bg-destructive" />
                                            A Receber
                                          </span>
                                          <span className="text-sm font-medium text-destructive">{formatCurrencyBR(data.aReceber || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                                          <span className="text-xs text-muted-foreground">Total</span>
                                          <span className="text-sm font-medium text-foreground">{formatCurrencyBR((data.receita || 0) + (data.aReceber || 0))}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {/* Linha de referência para média - controlada por legenda interativa */}
                            {showReceitaAverage && filteredMonthlyChart.length > 0 && (
                              <ReferenceLine 
                                y={filteredMonthlyChart.reduce((sum, item) => sum + item.receita, 0) / filteredMonthlyChart.length} 
                                stroke="hsl(var(--primary))" 
                                strokeDasharray="5 5"
                                strokeOpacity={0.7}
                              />
                            )}
                            <Bar 
                              dataKey="receita" 
                              fill="url(#receitaBarGradient)"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={50}
                              animationBegin={0}
                              animationDuration={800}
                              animationEasing="ease-out"
                            />
                            <Bar 
                              dataKey="aReceber" 
                              fill="url(#aReceberBarGradient)"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={50}
                              animationBegin={200}
                              animationDuration={800}
                              animationEasing="ease-out"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legenda interativa + Variação do período */}
                      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                        {/* Legendas das barras */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                            Recebido
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                            <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                            A Receber
                          </div>
                          {/* Toggle para média */}
                          <button
                            onClick={() => setShowReceitaAverage(!showReceitaAverage)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 border",
                              showReceitaAverage 
                                ? "bg-primary/10 text-primary border-primary/30" 
                                : "bg-muted/50 text-muted-foreground border-border/50 opacity-60"
                            )}
                          >
                            <div className={cn(
                              "w-3 h-0.5 border-t-2 border-dashed transition-colors",
                              showReceitaAverage ? "border-primary" : "border-muted-foreground"
                            )} />
                            Média
                          </button>
                        </div>
                        
                        {/* Variação do período */}
                        {filteredMonthlyChart.length >= 2 && (() => {
                          const first = filteredMonthlyChart.find(i => i.receita > 0)?.receita || 0;
                          const last = filteredMonthlyChart[filteredMonthlyChart.length - 1]?.receita || 0;
                          const variation = first > 0 ? ((last - first) / first) * 100 : 0;
                          const isPositive = variation >= 0;
                          
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Variação:</span>
                              <Badge 
                                variant={isPositive ? "default" : "destructive"}
                                className={cn(
                                  "font-semibold",
                                  isPositive && "bg-success/10 text-success hover:bg-success/20 border-success/20"
                                )}
                              >
                                {isPositive ? '+' : ''}{variation.toFixed(1)}%
                              </Badge>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollAnimation>

                {/* Gráfico de Ticket Médio - Moderno */}
                <ScrollAnimation animation="fade-up" delay={150} className="col-span-full">
                  <Card className="shadow-soft overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-success" />
                            <CardTitle>Ticket Médio</CardTitle>
                            <CardDescription className="hidden sm:block sm:ml-2">
                              | Evolução do valor médio por sessão
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            {(['1', '3', '6', '12'] as const).map((period) => (
                              <button
                                key={period}
                                onClick={() => handleTicketPeriodChange(period)}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200",
                                  ticketPeriod === period
                                    ? "bg-success text-success-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {period === '12' ? '1 ano' : `${period}m`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <CardDescription className="sm:hidden">
                          Evolução do valor médio por sessão
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Métricas resumidas com min/max reais */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-3 border border-success/20">
                          <p className="text-xs text-muted-foreground mb-1">Média</p>
                          <p className="text-lg font-bold text-success">{formatCurrencyBR(ticketMedioAverage)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Maior Pgto</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrencyBR(filteredTicketChart.length > 0 ? Math.max(...filteredTicketChart.map(i => i.maxPagamento || 0)) : 0)}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Menor Pgto</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrencyBR(filteredTicketChart.length > 0 ? Math.min(...filteredTicketChart.filter(i => (i.minPagamento || 0) > 0).map(i => i.minPagamento)) || 0 : 0)}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Sessões</p>
                          <p className="text-lg font-bold text-foreground">
                            {filteredTicketChart.reduce((sum, item) => sum + item.sessoes, 0)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Gráfico de Barras com 3 barras: Maior, Ticket Médio, Menor */}
                      <div className="h-72 -mx-2">
                        <ResponsiveContainer key={`ticket-chart-${ticketPeriod}`} width="100%" height="100%">
                          <BarChart
                            data={filteredTicketChart}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            barGap={2}
                            barCategoryGap="15%"
                          >
                            <defs>
                              <linearGradient id="ticketBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={1}/>
                                <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.6}/>
                              </linearGradient>
                              <linearGradient id="maxBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                              </linearGradient>
                              <linearGradient id="minBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.7}/>
                                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              vertical={false}
                              stroke="hsl(var(--border))"
                              strokeOpacity={0.5}
                            />
                            <XAxis 
                              dataKey="mes" 
                              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                              tickLine={false}
                              axisLine={false}
                              dy={8}
                            />
                            <YAxis 
                              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `R$${(value/1).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                              width={60}
                            />
                            {/* Linha de referência para média - controlada por legenda */}
                            {showTicketAverage && filteredTicketChart.length > 0 && (
                              <ReferenceLine 
                                y={ticketMedioAverage} 
                                stroke="hsl(142 76% 36%)" 
                                strokeDasharray="5 5"
                                strokeOpacity={0.7}
                              />
                            )}
                            <RechartsTooltip 
                              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-popover border border-border shadow-lg rounded-lg p-3 min-w-[180px]">
                                      <p className="text-sm font-semibold text-foreground mb-2">{data.fullMonth}</p>
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-sm bg-primary" />
                                            Maior Pgto
                                          </span>
                                          <span className="text-sm font-medium text-primary">{formatCurrencyBR(data.maxPagamento || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-sm bg-success" />
                                            Ticket Médio
                                          </span>
                                          <span className="text-sm font-bold text-success">{formatCurrencyBR(data.ticketMedio)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-sm bg-muted-foreground" />
                                            Menor Pgto
                                          </span>
                                          <span className="text-sm font-medium text-muted-foreground">{formatCurrencyBR(data.minPagamento || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground">Sessões</span>
                                          <span className="text-sm font-medium text-foreground">{data.sessoes}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                                          <span className="text-xs text-muted-foreground">Total</span>
                                          <span className="text-sm font-medium text-foreground">{formatCurrencyBR(data.totalValor || 0)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="maxPagamento" 
                              fill="url(#maxBarGradient)"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={50}
                              animationBegin={0}
                              animationDuration={800}
                              animationEasing="ease-out"
                            />
                            <Bar 
                              dataKey="ticketMedio" 
                              fill="url(#ticketBarGradient)"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={50}
                              animationBegin={200}
                              animationDuration={800}
                              animationEasing="ease-out"
                            />
                            <Bar 
                              dataKey="minPagamento" 
                              fill="url(#minBarGradient)"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={50}
                              animationBegin={400}
                              animationDuration={800}
                              animationEasing="ease-out"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legenda interativa + Variação do período */}
                      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                        {/* Legendas das barras */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                            Maior Pgto
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                            <div className="w-2.5 h-2.5 rounded-sm bg-success" />
                            Ticket Médio
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground" />
                            Menor Pgto
                          </div>
                          {/* Toggle para média */}
                          <button
                            onClick={() => setShowTicketAverage(!showTicketAverage)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 border",
                              showTicketAverage 
                                ? "bg-success/10 text-success border-success/30" 
                                : "bg-muted/50 text-muted-foreground border-border/50 opacity-60"
                            )}
                          >
                            <div className={cn(
                              "w-3 h-0.5 border-t-2 border-dashed transition-colors",
                              showTicketAverage ? "border-success" : "border-muted-foreground"
                            )} />
                            Média
                          </button>
                        </div>
                        
                        {/* Variação do período */}
                        {filteredTicketChart.length >= 2 && (() => {
                          const first = filteredTicketChart.find(i => i.ticketMedio > 0)?.ticketMedio || 0;
                          const last = filteredTicketChart[filteredTicketChart.length - 1]?.ticketMedio || 0;
                          const variation = first > 0 ? ((last - first) / first) * 100 : 0;
                          const isPositive = variation >= 0;
                          
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Variação:</span>
                              <Badge 
                                variant={isPositive ? "default" : "destructive"}
                                className={cn(
                                  "font-semibold",
                                  isPositive && "bg-success/10 text-success hover:bg-success/20 border-success/20"
                                )}
                              >
                                {isPositive ? '+' : ''}{variation.toFixed(1)}%
                              </Badge>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollAnimation>

                {/* Ticket Médio por Cliente - Modernizado */}
                <ScrollAnimation animation="fade-up" delay={200} className="col-span-full">
                  <Card className="shadow-soft overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-success" />
                          <CardTitle>Ticket Médio por {clientTerm}</CardTitle>
                          <CardDescription className="hidden sm:block sm:ml-2">
                            | Valor médio por sessão de cada {clientTerm.toLowerCase()}
                          </CardDescription>
                        </div>
                        <CardDescription className="sm:hidden">
                          Valor médio por sessão de cada {clientTerm.toLowerCase()}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Métricas resumidas */}
                      {clientTicketMedio.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-3 border border-success/20">
                            <p className="text-xs text-muted-foreground mb-1">Maior Ticket</p>
                            <p className="text-lg font-bold text-success">
                              {formatCurrencyBR(Math.max(...clientTicketMedio.map(c => c.ticketMedio)))}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Menor Ticket</p>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrencyBR(Math.min(...clientTicketMedio.map(c => c.ticketMedio)))}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Média Geral</p>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrencyBR(clientTicketMedio.reduce((sum, c) => sum + c.ticketMedio, 0) / clientTicketMedio.length)}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">{clientTermPlural}</p>
                            <p className="text-lg font-bold text-foreground">
                              {clientTicketMedio.length}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="h-auto">
                        <div className="space-y-3 pr-2">
                          {clientTicketMedio.length > 0 ? clientTicketMedio.map((client, index) => {
                            const maxTicket = Math.max(...clientTicketMedio.map(c => c.ticketMedio))
                            const widthPercent = maxTicket > 0 ? (client.ticketMedio / maxTicket) * 100 : 0
                            
                            return (
                              <div key={client.clientId} className="space-y-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-5">#{index + 1}</span>
                                    <p className="text-sm font-medium truncate flex-1">
                                      {client.nome}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-success whitespace-nowrap">
                                    {formatCurrencyBR(client.ticketMedio)}
                                  </p>
                                </div>
                                <div className="relative ml-7">
                                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                    <div 
                                      className="bg-gradient-to-r from-success to-success/70 h-2.5 rounded-full transition-all duration-500" 
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
                              <p className="text-muted-foreground">Nenhum {clientTerm.toLowerCase()} com sessões realizadas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollAnimation>

                {/* Gráfico de Pizza - Receita por Canal de Pagamento - Modernizado */}
                <ScrollAnimation animation="fade-up" delay={250} className="col-span-full">
                  <Card className="shadow-soft h-full overflow-visible">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-primary" />
                            <CardTitle>Receita por Canal</CardTitle>
                            <CardDescription className="hidden sm:block sm:ml-2">
                              | Distribuição da receita por método de pagamento
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            {(['1', '3', '6', '12'] as const).map((period) => (
                              <button
                                key={period}
                                onClick={() => handleCanalPeriodChange(period)}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200",
                                  canalPeriod === period
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {period === '12' ? '1 ano' : `${period}m`}
                              </button>
                            ))}
                          </div>
                        </div>
                        <CardDescription className="sm:hidden">
                          Distribuição da receita por método de pagamento
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Métricas resumidas */}
                      {receitaPorCanal.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-1">Total Receita</p>
                            <p className="text-lg font-bold text-primary">
                              {formatCurrencyBR(receitaPorCanal.reduce((sum, item) => sum + item.valor, 0))}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Maior Canal</p>
                            <p className="text-lg font-bold text-foreground">
                              {receitaPorCanal.length > 0 ? receitaPorCanal.reduce((max, item) => item.valor > max.valor ? item : max, receitaPorCanal[0]).canal : '-'}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Total Pagamentos</p>
                            <p className="text-lg font-bold text-foreground">
                              {receitaPorCanal.reduce((sum, item) => sum + (item.count || 0), 0)}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Canais Ativos</p>
                            <p className="text-lg font-bold text-foreground">
                              {receitaPorCanal.length}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-4 h-auto overflow-visible">
                        {/* Gráfico RadialBar moderno */}
                        <div className="h-[280px] lg:h-full flex items-center justify-center relative">
                          {receitaPorCanal.length > 0 ? (
                            <>
                              <ResponsiveContainer key={`canal-${renderedCanalPeriod}`} width="100%" height="100%">
                                <RadialBarChart 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius="30%" 
                                  outerRadius="85%" 
                                  barSize={18}
                                  data={(() => {
                                    // NÃO reverter - barra maior fica mais próxima do centro
                                    const maxValue = Math.max(...receitaPorCanal.map(item => item.valor));
                                    const activeChannels = receitaPorCanal.filter(item => item.valor > 0).length;
                                    // Limitar a 85% quando há múltiplos canais para a barra não fechar
                                    const maxPercentage = activeChannels === 1 ? 100 : 85;
                                    
                                    return receitaPorCanal.map((item, index) => {
                                      // Calcular porcentagem proporcional ao valor máximo (0-maxPercentage)
                                      let normalizedValue = 0;
                                      if (maxValue > 0) {
                                        normalizedValue = (item.valor / maxValue) * maxPercentage;
                                      }
                                      return {
                                        ...item,
                                        displayValue: normalizedValue,
                                        fill: item.color,
                                        name: item.canal,
                                        originalIndex: index,
                                        opacity: hoveredCanalIndex === null || hoveredCanalIndex === index ? 1 : 0.3
                                      };
                                    });
                                  })()}
                                  startAngle={0}
                                  endAngle={360}
                                >
                                  <PolarAngleAxis
                                    type="number"
                                    domain={[0, 100]}
                                    angleAxisId={0}
                                    tick={false}
                                  />
                                  <RadialBar
                                    background={{ fill: 'hsl(var(--muted))' }}
                                    dataKey="displayValue"
                                    cornerRadius={10}
                                    angleAxisId={0}
                                    isAnimationActive={true}
                                    animationBegin={0}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                    onMouseEnter={(data: any) => setHoveredCanalIndex(data.originalIndex)}
                                    onMouseLeave={() => setHoveredCanalIndex(null)}
                                  />
                                  <RechartsTooltip
                                    cursor={false}
                                    wrapperStyle={{ zIndex: 9999 }}
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const total = receitaPorCanal.reduce((sum, item) => sum + item.valor, 0);
                                        const percentage = total > 0 ? ((data.valor / total) * 100).toFixed(1) : '0';
                                        return (
                                          <div className="bg-popover border border-border shadow-lg rounded-lg p-3 min-w-[160px]">
                                            <div className="flex items-center gap-2 mb-2">
                                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
                                              <p className="text-sm font-semibold text-foreground">{data.canal}</p>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Valor</span>
                                                <span className="text-sm font-bold" style={{ color: data.fill }}>{formatCurrencyBR(data.valor)}</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Participação</span>
                                                <span className="text-sm font-medium text-foreground">{percentage}%</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Pagamentos</span>
                                                <span className="text-sm font-medium text-foreground">{data.count || 0}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </RadialBarChart>
                              </ResponsiveContainer>
                              {/* Centro do gráfico - mostrar quantidade de sessões */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center transition-all duration-300 w-20 h-20 flex flex-col items-center justify-center">
                                  {hoveredCanalIndex !== null && receitaPorCanal[hoveredCanalIndex] ? (
                                    <>
                                      <p className="text-3xl font-bold transition-all duration-300" style={{ color: receitaPorCanal[hoveredCanalIndex].color }}>
                                        {receitaPorCanal[hoveredCanalIndex].count || 0}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground leading-tight">pagamentos</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-3xl font-bold text-foreground">
                                        {receitaPorCanal.reduce((sum, item) => sum + (item.count || 0), 0)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground leading-tight">pagamentos</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center py-8">
                              <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">Nenhum dado no período</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Lista de Canais com animação e hover sincronizado */}
                        <div className="flex flex-col gap-2 lg:justify-center overflow-visible p-2">
                          {receitaPorCanal.length > 0 ? receitaPorCanal.map((canal, index) => {
                            const total = receitaPorCanal.reduce((sum, item) => sum + item.valor, 0)
                            const percentage = total > 0 ? ((canal.valor / total) * 100).toFixed(1) : '0'
                            const isHovered = hoveredCanalIndex === index
                            
                            return (
                              <div 
                                key={canal.canal} 
                                className={cn(
                                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer",
                                  isHovered 
                                    ? "bg-accent/80 shadow-lg scale-[1.02] border-2" 
                                    : "bg-accent/30 hover:bg-accent/50 border border-border/50",
                                  hoveredCanalIndex !== null && !isHovered && "opacity-50"
                                )}
                                style={{
                                  borderColor: isHovered ? canal.color : undefined
                                }}
                                onMouseEnter={() => setHoveredCanalIndex(index)}
                                onMouseLeave={() => setHoveredCanalIndex(null)}
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className={cn(
                                      "w-4 h-4 rounded-full flex-shrink-0 transition-all duration-300",
                                      isHovered && "scale-125"
                                    )}
                                    style={{ 
                                      backgroundColor: canal.color,
                                      boxShadow: isHovered ? `0 0 12px ${canal.color}` : 'none'
                                    }}
                                  />
                                  <div>
                                    <span className={cn(
                                      "font-medium text-sm transition-all duration-300",
                                      isHovered && "font-semibold"
                                    )}>{canal.canal}</span>
                                    <p className="text-xs text-muted-foreground">{canal.count || 0} pagamentos</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={cn(
                                    "font-bold text-sm transition-all duration-300",
                                    isHovered ? "text-lg" : "text-primary"
                                  )} style={{ color: isHovered ? canal.color : undefined }}>{formatCurrencyBR(canal.valor)}</p>
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
                </ScrollAnimation>
              </div>
            </CardContent>
          </Card>

          {/* Coluna da Direita */}
          <div className="space-y-6 flex flex-col">
            {/* Upgrade de Plano */}
            <Card className="shadow-soft opacity-0 animate-scale-fade-in" style={{ animationDelay: '400ms' }}>
              <CardContent className="p-6">
                <UpgradePlanCard currentPlan={currentPlan} />
              </CardContent>
            </Card>

            {/* Top 5 Clientes que Mais Pagam */}
            <Card className="shadow-soft opacity-0 animate-scale-fade-in h-[460px] flex flex-col overflow-visible" style={{ animationDelay: '475ms' }}>
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Top 5 {clientTermPlural}
                </CardTitle>
                <CardDescription>
                  {clientTermPlural} que mais geraram receita
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-visible pt-2">
                <div className="space-y-4">
                  {topClients.length > 0 ? topClients.map((client, index) => (
                    <div key={client.clientId} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors relative cursor-pointer overflow-visible" onClick={() => navigate('/clientes')}>
                      {/* Coroa dourada animada para o primeiro cliente */}
                      {index === 0 && (
                        <div className="absolute -top-3 -right-3 z-10">
                          <Crown 
                            className="w-7 h-7 text-yellow-500 animate-crown-glow"
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{client.nome}</p>
                          <TooltipProvider>
                            {client.medicamentos && client.medicamentos.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Pill className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Faz uso de medicamentos</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {client.eh_crianca_adolescente && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Baby className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Criança/Adolescente</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
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
                      <p className="text-muted-foreground">Nenhum {clientTerm.toLowerCase()} com pagamentos ainda</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Clientes Recentes */}
            <Card className="shadow-soft h-[580px] flex flex-col opacity-0 animate-scale-fade-in" style={{ animationDelay: '550ms' }}>
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" />
                  {clientTermPlural} Recentes
                </CardTitle>
                <CardDescription>
                  Últimos {clientTermPlural.toLowerCase()} adicionados
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {recentClients.length > 0 ? recentClients.slice(0, 10).map((client, index) => (
                    <div key={client.id || index} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate('/clientes')}>
                    <ClientAvatar 
                      avatarPath={client.avatar_url}
                      clientName={client.nome}
                      size="md"
                    />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{client.nome}</p>
                          <TooltipProvider>
                            {client.medicamentos && client.medicamentos.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Pill className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Faz uso de medicamentos</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {client.eh_crianca_adolescente && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Baby className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Criança/Adolescente</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
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
                      <p className="text-muted-foreground">Nenhum {clientTerm.toLowerCase()} adicionado ainda</p>
                      <Button variant="outline" className="mt-2" onClick={() => navigate("/clientes")}>
                        Adicionar {clientTerm}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <DashboardFooter />
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