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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
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
  const [hoveredCanalIndex, setHoveredCanalIndex] = useState<number | null>(null)
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
        
        ticketMedioData.push({
          mes: monthNames[date.getMonth()],
          ticketMedio: ticketMedio,
          sessoes: totalPaidCount,
          fullMonth: `${monthNamesLong[date.getMonth()]} ${date.getFullYear()}`
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

  const handleCanalPeriodChange = useCallback(async (period: '1' | '3' | '6' | '12') => {
    console.log('💳 Mudando período dos canais para:', period)
    setCanalPeriod(period)
    
    // Carregar dados diretamente sem cache para garantir dados corretos
    await loadCanalData(period)
  }, [user])

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

    } catch (error) {
      console.error('Erro ao carregar dados do canal:', error)
    }
  }, [user])

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
      <div className="space-y-4 md:space-y-8 pb-4 md:pb-8">
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
              <div className="opacity-0 animate-scale-fade-in" style={{ animationDelay: '150ms' }}>
                <PackageStatusCard stats={packageStats} />
              </div>
              <div className="opacity-0 animate-scale-fade-in" style={{ animationDelay: '225ms' }}>
                <BusinessOrbitalView 
                  dashboardData={dashboardData}
                  packageStats={packageStats}
                  upcomingSessionsCount={upcomingSessions.length}
                />
              </div>
              <div className="opacity-0 animate-scale-fade-in" style={{ animationDelay: '300ms' }}>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
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

                <div className="col-span-full opacity-0 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          <CardTitle>Receita Financeira</CardTitle>
                          <CardDescription className="hidden sm:block sm:ml-2">
                            | Acompanhe sua evolução financeira nos últimos {chartPeriod} meses
                          </CardDescription>
                        </div>
                        <CardDescription className="sm:hidden">
                          Acompanhe sua evolução financeira nos últimos {chartPeriod} meses
                        </CardDescription>
                        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2 sm:justify-end">
                          <Button 
                            variant={chartPeriod === '1' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('1')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            1 mês
                          </Button>
                          <Button 
                            variant={chartPeriod === '3' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('3')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            3 meses
                          </Button>
                          <Button 
                            variant={chartPeriod === '6' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('6')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            6 meses
                          </Button>
                          <Button 
                            variant={chartPeriod === '12' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handlePeriodChange('12')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            1 ano
                          </Button>
                        </div>
                      </div>
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
                               <RechartsTooltip 
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
                <div className="col-span-full opacity-0 animate-fade-in-up" style={{ animationDelay: '575ms' }}>
                  <Card className="shadow-soft">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-success" />
                          <CardTitle>Ticket Médio</CardTitle>
                          <CardDescription className="hidden sm:block sm:ml-2">
                            | Ticket médio por sessão ao longo do tempo
                          </CardDescription>
                        </div>
                        <CardDescription className="sm:hidden">
                          Ticket médio por sessão ao longo do tempo
                        </CardDescription>
                        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2 sm:justify-end">
                          <Button 
                            variant={ticketPeriod === '1' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('1')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            1 mês
                          </Button>
                          <Button 
                            variant={ticketPeriod === '3' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('3')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            3 meses
                          </Button>
                          <Button 
                            variant={ticketPeriod === '6' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('6')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            6 meses
                          </Button>
                          <Button 
                            variant={ticketPeriod === '12' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleTicketPeriodChange('12')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            1 ano
                          </Button>
                        </div>
                      </div>
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
                              <RechartsTooltip 
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
                <div className="col-span-full opacity-0 animate-fade-in-up" style={{ animationDelay: '650ms' }}>
                  <Card className="shadow-soft">
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
                    <CardContent>
                      <div className="h-auto">
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
                              <p className="text-muted-foreground">Nenhum {clientTerm.toLowerCase()} com sessões realizadas</p>
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
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <CardTitle>Receita por Canal</CardTitle>
                          <CardDescription className="hidden sm:block sm:ml-2">
                            | Distribuição da receita por método de pagamento
                          </CardDescription>
                        </div>
                        <CardDescription className="sm:hidden">
                          Distribuição da receita por método de pagamento
                        </CardDescription>
                        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2 sm:justify-end mt-5">
                          <Button 
                            variant={canalPeriod === '1' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('1')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            1 mês
                          </Button>
                          <Button 
                            variant={canalPeriod === '3' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('3')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            3 meses
                          </Button>
                          <Button 
                            variant={canalPeriod === '6' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('6')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            6 meses
                          </Button>
                          <Button 
                            variant={canalPeriod === '12' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => handleCanalPeriodChange('12')}
                            className="text-xs md:text-sm px-2 md:px-3"
                          >
                            1 ano
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="h-auto lg:h-[560px] px-4 pt-3 pb-4">
                      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-4 h-full">
                        {/* Gráfico de Pizza - Moderno estilo donut contínuo com sobreposição */}
                        <div className="h-[280px] lg:h-full lg:min-h-[400px] flex items-center justify-center relative">
                          {(() => {
                            const total = receitaPorCanal.reduce((sum, item) => sum + item.valor, 0)
                            if (total === 0) return null
                            
                            const cx = 200
                            const cy = 200
                            const radius = 122.5 // Raio do meio do stroke
                            const strokeWidth = 45
                            
                            let currentAngle = -90 // Começa do topo (SVG usa -90 para topo)
                            const overlapDeg = 12 // Sobreposição em graus
                            
                            const segments: { startAngle: number; endAngle: number; color: string; index: number }[] = []
                            
                            receitaPorCanal.forEach((item, index) => {
                              const angle = (item.valor / total) * 360
                              const isLast = index === receitaPorCanal.length - 1
                              segments.push({
                                startAngle: currentAngle,
                                // Last segment should NOT have overlap to avoid duplication
                                endAngle: currentAngle + angle + (isLast ? 0 : overlapDeg),
                                color: item.color,
                                index
                              })
                              currentAngle += angle
                            })
                            
                            // Função para criar arco usando stroke
                            const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
                              const angleInRadians = (angleInDegrees * Math.PI) / 180
                              return {
                                x: centerX + r * Math.cos(angleInRadians),
                                y: centerY + r * Math.sin(angleInRadians)
                              }
                            }
                            
                            const describeArc = (startAngle: number, endAngle: number) => {
                              const start = polarToCartesian(cx, cy, radius, endAngle)
                              const end = polarToCartesian(cx, cy, radius, startAngle)
                              const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
                              
                              return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
                            }
                            
                            // Índice do último segmento
                            const lastIndex = segments.length - 1
                            
                            return (
                              <svg viewBox="0 0 400 400" className="w-full h-full max-w-[380px] max-h-[380px]">
                                <defs>
                                  {segments.map((segment) => (
                                    <filter key={`shadow-${segment.index}`} id={`pie-shadow-${segment.index}`} x="-50%" y="-50%" width="200%" height="200%">
                                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={segment.color} floodOpacity="0.5"/>
                                    </filter>
                                  ))}
                                </defs>
                                
                                {/* Renderizar segmentos na ordem normal (cada um por cima do anterior) */}
                                {segments.map((segment) => (
                                  <path
                                    key={`segment-${segment.index}`}
                                    d={describeArc(segment.startAngle, segment.endAngle)}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    style={{
                                      cursor: 'pointer',
                                      transition: 'filter 0.15s ease-out'
                                    }}
                                    onMouseEnter={() => setHoveredCanalIndex(segment.index)}
                                    onMouseLeave={() => setHoveredCanalIndex(null)}
                                  />
                                ))}
                                
                                {/* Capa do primeiro segmento sobre o final do último (efeito corrente) */}
                                {segments.length > 1 && (
                                  <path
                                    key="segment-first-cap"
                                    d={describeArc(segments[0].startAngle, segments[0].startAngle + 15)}
                                    fill="none"
                                    stroke={segments[0].color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredCanalIndex(0)}
                                    onMouseLeave={() => setHoveredCanalIndex(null)}
                                  />
                                )}
                                
                                {/* Hover: renderizar segmento por cima de tudo com sombra */}
                                {hoveredCanalIndex !== null && segments[hoveredCanalIndex] && hoveredCanalIndex !== segments.length - 1 && (
                                  <>
                                    <path
                                      key={`segment-hover-${hoveredCanalIndex}`}
                                      d={describeArc(segments[hoveredCanalIndex].startAngle, segments[hoveredCanalIndex].endAngle)}
                                      fill="none"
                                      stroke={segments[hoveredCanalIndex].color}
                                      strokeWidth={strokeWidth}
                                      strokeLinecap="round"
                                      style={{
                                        filter: `url(#pie-shadow-${hoveredCanalIndex})`,
                                        pointerEvents: 'none'
                                      }}
                                    />
                                    {/* Se hover no primeiro, também renderizar a capa com sombra */}
                                    {hoveredCanalIndex === 0 && segments.length > 1 && (
                                      <path
                                        key="segment-first-cap-hover"
                                        d={describeArc(segments[0].startAngle, segments[0].startAngle + 15)}
                                        fill="none"
                                        stroke={segments[0].color}
                                        strokeWidth={strokeWidth}
                                        strokeLinecap="round"
                                        style={{
                                          filter: `url(#pie-shadow-0)`,
                                          pointerEvents: 'none'
                                        }}
                                      />
                                    )}
                                  </>
                                )}
                                
                                {/* Hover do ÚLTIMO segmento: renderizar por cima de tudo incluindo a capa */}
                                {hoveredCanalIndex === segments.length - 1 && segments[hoveredCanalIndex] && (
                                  <path
                                    key={`segment-hover-last`}
                                    d={describeArc(segments[hoveredCanalIndex].startAngle, segments[hoveredCanalIndex].endAngle)}
                                    fill="none"
                                    stroke={segments[hoveredCanalIndex].color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    style={{
                                      filter: `url(#pie-shadow-${hoveredCanalIndex})`,
                                      pointerEvents: 'none'
                                    }}
                                  />
                                )}
                              </svg>
                            )
                          })()}
                          {/* Centro do gráfico com informações dinâmicas */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              {hoveredCanalIndex !== null && receitaPorCanal[hoveredCanalIndex] ? (
                                <>
                                  <p className="text-xs text-muted-foreground mb-1">{receitaPorCanal[hoveredCanalIndex].canal}</p>
                                  <p className="text-3xl font-bold" style={{ color: receitaPorCanal[hoveredCanalIndex].color }}>
                                    {receitaPorCanal[hoveredCanalIndex].count || 0}
                                  </p>
                                  <p className="text-xs text-muted-foreground">pagamentos</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {receitaPorCanal.reduce((sum, item) => sum + (item.count || 0), 0)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">pagamentos</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Lista de Canais */}
                        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-2 lg:gap-0 lg:justify-center">
                          {receitaPorCanal.length > 0 ? receitaPorCanal.map((canal, index) => {
                            const total = receitaPorCanal.reduce((sum, item) => sum + item.valor, 0)
                            const percentage = total > 0 ? ((canal.valor / total) * 100).toFixed(1) : '0'
                            const isHovered = hoveredCanalIndex === index
                            
                            return (
                              <div 
                                key={canal.canal} 
                                className={cn(
                                  "flex flex-col lg:flex-row lg:items-center lg:justify-between px-3 py-2 lg:px-4 lg:py-3 rounded-xl transition-all duration-300 cursor-pointer",
                                  isHovered 
                                    ? "bg-accent/80 shadow-md scale-[1.02] border-2" 
                                    : "bg-accent/30 hover:bg-accent/50 border border-border/50",
                                  hoveredCanalIndex !== null && !isHovered && "opacity-50"
                                )}
                                style={{
                                  borderColor: isHovered ? canal.color : undefined
                                }}
                                onMouseEnter={() => setHoveredCanalIndex(index)}
                                onMouseLeave={() => setHoveredCanalIndex(null)}
                              >
                                <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-0">
                                  <div 
                                    className={cn(
                                      "w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full flex-shrink-0 transition-transform duration-300",
                                      isHovered && "scale-125"
                                    )}
                                    style={{ 
                                      backgroundColor: canal.color,
                                      boxShadow: isHovered ? `0 0 8px ${canal.color}` : 'none'
                                    }}
                                  />
                                  <span className={cn(
                                    "font-medium text-xs lg:text-sm transition-all duration-300 truncate",
                                    isHovered && "font-semibold"
                                  )}>{canal.canal}</span>
                                </div>
                                <div className="text-left lg:text-right pl-5 lg:pl-0">
                                  <p className={cn(
                                    "font-bold text-xs lg:text-sm transition-all duration-300",
                                    isHovered ? "lg:text-lg" : "text-primary"
                                  )} style={{ color: isHovered ? canal.color : undefined }}>{formatCurrencyBR(canal.valor)}</p>
                                  <p className="text-[10px] lg:text-xs text-muted-foreground">{percentage}%</p>
                                </div>
                              </div>
                            )
                          }) : (
                            <div className="col-span-2 text-center py-8">
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
            <Card className="shadow-soft opacity-0 animate-scale-fade-in" style={{ animationDelay: '400ms' }}>
              <CardContent className="p-6">
                <UpgradePlanCard currentPlan={currentPlan} />
              </CardContent>
            </Card>

            {/* Top 5 Clientes que Mais Pagam */}
            <Card className="shadow-soft flex-1 opacity-0 animate-scale-fade-in" style={{ animationDelay: '475ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Top 5 {clientTermPlural}
                </CardTitle>
                <CardDescription>
                  {clientTermPlural} que mais geraram receita
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="space-y-4">
                  {topClients.length > 0 ? topClients.map((client, index) => (
                    <div key={client.clientId} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors relative cursor-pointer" onClick={() => navigate('/clientes')}>
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
            <Card className="shadow-soft flex-1 opacity-0 animate-scale-fade-in" style={{ animationDelay: '550ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" />
                  {clientTermPlural} Recentes
                </CardTitle>
                <CardDescription>
                  Últimos {clientTermPlural.toLowerCase()} adicionados
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="space-y-3">
                  {recentClients.length > 0 ? recentClients.slice(0, 5).map((client, index) => (
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