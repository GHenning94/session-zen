import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Package,
  Repeat,
} from "lucide-react"
import { Input } from "@/components/ui/input"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { generateReceiptPDF } from "@/utils/receiptGenerator"
import { useNavigate } from 'react-router-dom'
import PaymentMethodModal from "@/components/PaymentMethodModal"
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal"
import { formatCurrencyBR, formatTimeBR, formatDateBR, formatPaymentMethod } from "@/utils/formatters"
import { getPaymentEffectiveDate, isOverdue } from "@/utils/sessionStatusUtils"
import { cn } from "@/lib/utils"
import { PulsingDot } from "@/components/ui/pulsing-dot"
import { GoogleSyncBadge } from "@/components/google/GoogleSyncBadge"
import { BatchSelectionBar, SelectableItemCheckbox } from "@/components/BatchSelectionBar"
import { ClientAvatar } from "@/components/ClientAvatar"

const Pagamentos = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, hasFeature } = useSubscription()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterPeriod, setFilterPeriod] = useState("todos")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterMethod, setFilterMethod] = useState("todos")
  const [filterName, setFilterName] = useState("")
  const [filterPaymentType, setFilterPaymentType] = useState("todos")
  const [filterGoogleSync, setFilterGoogleSync] = useState("todos")
const [sessions, setSessions] = useState<any[]>([])
const [clients, setClients] = useState<any[]>([])
const [profiles, setProfiles] = useState<any[]>([])
const [payments, setPayments] = useState<any[]>([])
const [isLoading, setIsLoading] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null)
  const [viewedPaymentIds, setViewedPaymentIds] = useState<Set<string>>(new Set())
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Carregar dados do Supabase
  const loadData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Carregar sessões (apenas campos necessários + google_sync_type)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, data, horario, status, valor, metodo_pagamento, client_id, package_id, google_sync_type')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .order('horario', { ascending: false })
      
      // Carregar pagamentos com relacionamentos (campos otimizados)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id, valor, status, metodo_pagamento, data_vencimento, data_pagamento,
          observacoes, created_at, package_id, session_id, client_id,
          packages:package_id (nome, total_sessoes, sessoes_consumidas, data_fim, data_inicio),
          sessions:session_id (data, horario, status, valor, metodo_pagamento, recurring_session_id, google_sync_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (paymentsError) {
        console.error('Erro ao carregar pagamentos:', paymentsError)
      } else {
        setPayments(paymentsData || [])
      }
      
      // Carregar clientes (apenas campos necessários)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome, avatar_url, user_id')
        .eq('user_id', user.id)

      // Carregar perfil do profissional (apenas campos para recibo)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nome, profissao, crp, telefone, cpf_cnpj, user_id')
        .eq('user_id', user.id)

      if (sessionsError) {
        console.error('Erro ao carregar sessões:', sessionsError)
      } else {
        setSessions(sessionsData || [])
      }

      if (clientsError) {
        console.error('Erro ao carregar clientes:', clientsError)
      } else {
        setClients(clientsData || [])
      }

      if (profileError) {
        console.error('Erro ao carregar perfil:', profileError)
      } else {
        setProfiles(profileData || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Check for highlighted payment from URL params
  useEffect(() => {
    const highlightParam = searchParams.get('highlight')
    
    if (highlightParam) {
      setHighlightedPaymentId(highlightParam)
      
      // Clear the URL parameters after a delay
      setTimeout(() => {
        setSearchParams({})
        setHighlightedPaymentId(null)
      }, 3000)
    }
  }, [searchParams, setSearchParams])

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente não encontrado'
  }

const getSessionPayments = () => {
  // Mapear diretamente da tabela payments (sessões + pacotes)
  return (payments || []).map((p: any) => {
    const isPackage = !!p.package_id
    const client = clients.find(c => c.id === p.client_id)
    const effective = getPaymentEffectiveDate(p)
    const effDateStr = effective.toISOString().split('T')[0]
    const time = isPackage ? '00:00:00' : (p.sessions?.horario || '00:00:00')

    return {
      id: p.id,
      client: client?.nome || 'Cliente não encontrado',
      client_avatar: client?.avatar_url,
      date: isPackage ? (p.packages?.data_inicio || effDateStr) : (p.sessions?.data || effDateStr),
      time,
      value: p.valor || 0,
      status: p.status || 'pendente',
      method: p.metodo_pagamento || p.sessions?.metodo_pagamento || 'A definir',
      session_id: p.session_id,
      session_status: p.sessions?.status,
      session_valor: p.sessions?.valor,
      package_id: p.package_id,
      package_name: p.packages?.nome,
      package_sessions: p.packages ? `${p.packages.sessoes_consumidas || 0}/${p.packages.total_sessoes || 0}` : undefined,
      package_data_inicio: p.packages?.data_inicio,
      package_data_fim: p.packages?.data_fim,
      recurring_session_id: p.sessions?.recurring_session_id,
      google_sync_type: p.sessions?.google_sync_type,
      type: isPackage ? 'package' : 'session',
      raw: p,
    }
  })
}

  const markAsPaid = async (sessionId: string, paymentMethod: string) => {
    setIsLoading(true)
    try {
      // CORREÇÃO: Buscar sessão para verificar se é futura
      const session = sessions.find(s => s.id === sessionId)
      if (!session) throw new Error('Sessão não encontrada')
      
      const sessionDateTime = new Date(`${session.data}T${session.horario}`)
      const now = new Date()
      const isFuture = sessionDateTime >= now
      
      // Se a sessão é futura, apenas atualizar o método de pagamento, sem mudar o status
      const updateData = isFuture 
        ? { metodo_pagamento: paymentMethod }
        : { status: 'realizada', metodo_pagamento: paymentMethod }
      
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
      
      if (error) throw error
      
      toast({
        title: "Pagamento Confirmado",
        description: isFuture 
          ? "O pagamento foi registrado para a sessão futura."
          : "O pagamento foi marcado como recebido.",
      })
      
      await loadData()
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('paymentUpdated'))
    } catch (error) {
      console.error('Erro ao marcar pagamento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível confirmar o pagamento.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openPaymentModal = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setPaymentModalOpen(true)
  }

  const openDetailsModal = (payment: any) => {
    setSelectedPayment(payment)
    setDetailsModalOpen(true)
    // Marcar pagamento como visualizado para parar o blinking
    if (payment.id) {
      setViewedPaymentIds(prev => new Set([...prev, payment.id]))
    }
  }

  const handleGenerateReceipt = (payment: any) => {
    generateReceipt(payment)
  }

  const handleViewSession = (sessionId: string) => {
    viewSession(sessionId)
  }

  const handleMarkAsPaidFromModal = (sessionId: string) => {
    openPaymentModal(sessionId)
  }

  const handleUpdatePaymentStatus = async (paymentId: string, status: string, method?: string) => {
    setIsLoading(true)
    try {
      // Verificar se é pagamento de pacote ou sessão
      const payment = allPayments.find(p => p.id === paymentId)
      
      // Dados para atualização do pagamento
      const updatePaymentData: any = { status }
      if (status === 'pago') {
        updatePaymentData.data_pagamento = new Date().toISOString().split('T')[0]
      }
      if (method) {
        updatePaymentData.metodo_pagamento = method
      }
      
      // Atualizar tabela payments pelo ID do pagamento
      const { error: paymentError } = await supabase
        .from('payments')
        .update(updatePaymentData)
        .eq('id', paymentId)
      
      if (paymentError) throw paymentError
      
      // Se for sessão e tiver método de pagamento, atualizar também a sessão
      if (payment?.type === 'session' && payment?.session_id && method) {
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({ metodo_pagamento: method })
          .eq('id', payment.session_id)
        
        if (sessionError) console.error('Erro ao atualizar sessão:', sessionError)
      }
      
      toast({
        title: "Status Atualizado",
        description: "O status do pagamento foi atualizado com sucesso.",
      })
      
      // Recarregar dados
      await loadData()
      
      // Notificar Dashboard e outras páginas para atualizar
      window.dispatchEvent(new Event('paymentUpdated'))
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pagamento.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentConfirm = async (method: string) => {
    if (selectedSessionId) {
      await markAsPaid(selectedSessionId, method)
      setPaymentModalOpen(false)
      setSelectedSessionId(null)
    }
  }

  // Funções de seleção em lote
  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => {
      const next = new Set(prev)
      if (next.has(paymentId)) next.delete(paymentId)
      else next.add(paymentId)
      return next
    })
  }

  const selectAllPayments = () => {
    setSelectedPayments(new Set(filteredPayments.map(p => p.id)))
    setIsSelectionMode(true)
  }
  const clearPaymentSelection = () => {
    setSelectedPayments(new Set())
    setIsSelectionMode(false)
  }

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedPayments(new Set())
    }
    setIsSelectionMode(!isSelectionMode)
  }

  const handleBatchStatusChange = async (status: string) => {
    try {
      const ids = Array.from(selectedPayments)
      const updateData: any = { status }
      if (status === 'pago') updateData.data_pagamento = new Date().toISOString().split('T')[0]
      
      const { error } = await supabase.from('payments').update(updateData).in('id', ids)
      if (error) throw error
      
      toast({ title: "Status atualizado", description: `${ids.length} pagamento(s) atualizado(s).` })
      setSelectedPayments(new Set())
      await loadData()
      window.dispatchEvent(new Event('paymentUpdated'))
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar os pagamentos.", variant: "destructive" })
    }
  }

const filterByPeriod = (items: any[]) => {
  if (filterPeriod === "todos") return items
  
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const startDate = new Date(now)
  
  switch (filterPeriod) {
    case "hoje": {
      return items.filter(item => {
        const eff = getPaymentEffectiveDate(item.raw)
        const effDate = new Date(eff)
        effDate.setHours(0, 0, 0, 0)
        return effDate.getTime() === now.getTime()
      })
    }
    case "semana":
      startDate.setDate(now.getDate() - 7)
      break
    case "mes":
      startDate.setMonth(now.getMonth() - 1)
      break
    case "trimestre":
      startDate.setMonth(now.getMonth() - 3)
      break
    default:
      return items
  }
  
  return items.filter(item => {
    const eff = getPaymentEffectiveDate(item.raw)
    return eff >= startDate && eff <= now
  })
}

  // Filtrar e ordenar pagamentos pela mais próxima (futuros primeiro, depois passados)
  const allPayments = getSessionPayments()
  const filteredPayments = filterByPeriod(allPayments).filter(payment => {
    const statusMatch = filterStatus === "todos" || payment.status === filterStatus
    const nameMatch = filterName === "" || payment.client.toLowerCase().includes(filterName.toLowerCase())
    const methodMatch = filterMethod === "todos" || payment.method === filterMethod
    
    // Filtro por tipo de pagamento (individual/pacote/recorrente)
    let typeMatch = true
    if (filterPaymentType !== "todos") {
      if (filterPaymentType === "individual") {
        typeMatch = !payment.package_id && !payment.recurring_session_id
      } else if (filterPaymentType === "package") {
        typeMatch = !!payment.package_id
      } else if (filterPaymentType === "recurring") {
        typeMatch = !!payment.recurring_session_id
      }
    }

    // Filtro por sincronização Google
    let googleSyncMatch = true
    if (filterGoogleSync !== "todos") {
      const syncType = payment.google_sync_type
      if (filterGoogleSync === "local") {
        googleSyncMatch = !syncType || syncType === 'local'
      } else {
        googleSyncMatch = syncType === filterGoogleSync
      }
    }
    
    return statusMatch && nameMatch && methodMatch && typeMatch && googleSyncMatch
  }).sort((a, b) => {
    const now = new Date()
    const dateTimeA = new Date(`${a.date}T${a.time}`)
    const dateTimeB = new Date(`${b.date}T${b.time}`)
    
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

// Separar pagamentos em futuros e passados usando data+horário (igual à página de sessões)
const now = new Date()

const futurePayments = filteredPayments.filter(item => {
  // Para pagamentos de sessão, usar data+horário da sessão
  if (item.type === 'session' && item.date && item.time) {
    const [year, month, day] = item.date.split('-').map(Number)
    const [hours, minutes] = item.time.split(':').map(Number)
    const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0)
    return sessionDateTime > now
  }
  // Para pacotes, usar a data efetiva
  const eff = getPaymentEffectiveDate(item.raw)
  return eff > now
})

const pastPayments = filteredPayments.filter(item => {
  // Para pagamentos de sessão, usar data+horário da sessão
  if (item.type === 'session' && item.date && item.time) {
    const [year, month, day] = item.date.split('-').map(Number)
    const [hours, minutes] = item.time.split(':').map(Number)
    const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0)
    return sessionDateTime <= now
  }
  // Para pacotes, usar a data efetiva
  const eff = getPaymentEffectiveDate(item.raw)
  return eff <= now
})

  const totalReceived = filteredPayments
    .filter(p => p.status === 'pago')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const totalPending = filteredPayments
    .filter(p => p.status === 'pendente')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const totalCancelled = filteredPayments
    .filter(p => p.status === 'cancelado')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const paidCount = filteredPayments.filter(p => p.status === 'pago').length
  const pendingCount = filteredPayments.filter(p => p.status === 'pendente').length
  const cancelledCount = filteredPayments.filter(p => p.status === 'cancelado').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'success'
      case 'pendente': return 'warning'
      case 'cancelado': return 'destructive'
      default: return 'warning'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago': return CheckCircle
      case 'pendente': return Clock
      default: return Clock
    }
  }

  const generateReceipt = (payment: any) => {
    // Verificar se o pagamento está concluído
    if (payment.status !== 'pago') {
      toast({
        title: "Pagamento Pendente",
        description: "É necessário marcar o pagamento como concluído antes de gerar o recibo.",
        variant: "destructive"
      })
      return
    }

    const session = sessions.find(s => s.id === payment.session_id)
    const client = clients.find(c => c.id === session?.client_id)
    const profile = profiles[0]
    
    if (!session || !client || !profile) {
      toast({
        title: "Erro",
        description: "Dados incompletos para gerar o recibo.",
        variant: "destructive"
      })
      return
    }

    const methodLabels = {
      'pix': 'PIX',
      'cartao': 'Cartão',
      'boleto': 'Boleto',
      'transferencia': 'Transferência',
      'dinheiro': 'Dinheiro'
    };

    const receiptData = {
      clientName: client.nome,
      sessionDate: session.data,
      sessionTime: session.horario,
      value: session.valor || 0,
      paymentMethod: methodLabels[session.metodo_pagamento as keyof typeof methodLabels] || session.metodo_pagamento || 'Dinheiro',
      professionalName: profile.nome,
      professionalCRP: profile.crp,
      sessionId: session.id
    }

    try {
      generateReceiptPDF(receiptData)
      
      toast({
        title: "Recibo gerado!",
        description: "O arquivo PDF foi baixado com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar o recibo. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const viewSession = (sessionId: string) => {
    // Encontrar a sessão para pegar a data
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      // Navegar para a agenda com a sessão selecionada e sua data
      navigate(`/agenda?highlight=${sessionId}&date=${session.data}`)
    } else {
      navigate('/agenda')
    }
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Mobile optimized */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie pagamentos e faturamento
          </p>
        </div>

        {/* Stats Cards - Vertical on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-success">
                {formatCurrencyBR(totalReceived)}
              </div>
              <p className="text-[10px] md:text-sm text-muted-foreground">{paidCount} confirmados</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-warning">
                {formatCurrencyBR(totalPending)}
              </div>
              <p className="text-[10px] md:text-sm text-muted-foreground">{pendingCount} pendentes</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Cancelados</CardTitle>
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-destructive">{cancelledCount}</div>
              <p className="text-[10px] md:text-sm text-muted-foreground">{cancelledCount} cancelados</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Taxa</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-primary">
                {(paidCount + pendingCount) > 0 ? ((paidCount / (paidCount + pendingCount)) * 100).toFixed(0) : 0}%
              </div>
              <p className="text-[10px] md:text-sm text-muted-foreground">Em dia</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Mobile optimized */}
        <Card className="shadow-soft">
          <CardHeader className="py-3 md:py-4">
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4">
              <div className="col-span-2">
                <label className="text-xs md:text-sm font-medium mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cliente..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs md:text-sm font-medium mb-1 block">Período</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">7 dias</SelectItem>
                    <SelectItem value="mes">Mês</SelectItem>
                    <SelectItem value="trimestre">Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs md:text-sm font-medium mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden md:block">
                <label className="text-xs md:text-sm font-medium mb-1 block">Canal</label>
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden md:block">
                <label className="text-xs md:text-sm font-medium mb-1 block">Tipo</label>
                <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="package">Pacote</SelectItem>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden lg:block">
                <label className="text-xs md:text-sm font-medium mb-1 block">Sincronização</label>
                <Select value={filterGoogleSync} onValueChange={setFilterGoogleSync}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="importado">Importado</SelectItem>
                    <SelectItem value="espelhado">Espelhado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Payment History */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>
              {filteredPayments.length} pagamento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Barra de seleção em lote */}
            {filteredPayments.length > 0 && (
              <BatchSelectionBar
                selectedCount={selectedPayments.size}
                totalCount={filteredPayments.length}
                onSelectAll={selectAllPayments}
                onClearSelection={clearPaymentSelection}
                onBatchStatusChange={handleBatchStatusChange}
                showStatusChange={true}
                statusOptions={[
                  { value: 'pago', label: 'Pago' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'cancelado', label: 'Cancelado' },
                ]}
                selectLabel="Selecionar pagamentos"
                isSelectionMode={isSelectionMode}
                onToggleSelectionMode={toggleSelectionMode}
              />
            )}
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando pagamentos...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pagamento encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Pagamentos de Sessões Futuras */}
                {futurePayments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px bg-border flex-1" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Pagamentos de Sessões Futuras
                      </h3>
                      <div className="h-px bg-border flex-1" />
                    </div>
                    <div className="space-y-4">
                       {futurePayments.map((payment) => {
                         const StatusIcon = getStatusIcon(payment.status)
                         
                          // Verificar se pagamento precisa de atenção (bolinha vermelha)
                           const needsAttention = isOverdue(payment.raw)
                          
                           return (
                           <div 
                             key={payment.id} 
                             className={cn(
                               "border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
                             )}
                             onClick={() => {
                               if (isSelectionMode) {
                                 togglePaymentSelection(payment.id)
                               } else {
                                 setSelectedPayment(payment)
                                 setDetailsModalOpen(true)
                                 if (payment.id) {
                                   setViewedPaymentIds(prev => new Set([...prev, payment.id]))
                                 }
                               }
                             }}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-4 flex-1">
                                 {isSelectionMode && (
                                   <SelectableItemCheckbox
                                     isSelected={selectedPayments.has(payment.id)}
                                     onSelect={() => togglePaymentSelection(payment.id)}
                                   />
                                 )}
                                 {!isSelectionMode && needsAttention && (
                                   <div className="absolute top-4 left-4">
                                     <PulsingDot color="destructive" size="md" />
                                   </div>
                                 )}
                                 <ClientAvatar 
                                   avatarPath={payment.client_avatar}
                                   clientName={payment.client || 'Cliente'}
                                   size="lg"
                                 />
                                 <div className="flex-1 min-w-0">
                                   <div className="flex flex-wrap items-center gap-2 mb-2">
                                     <h3 className="text-base md:text-lg font-semibold">{payment.client}</h3>
                                     <Badge variant={getStatusColor(payment.status)}>
                                       {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                     </Badge>
                                     {payment.google_sync_type && (
                                       <GoogleSyncBadge syncType={payment.google_sync_type} />
                                     )}
                                     {payment.type === 'package' && (
                                       <Package className="h-4 w-4 text-primary" />
                                     )}
                                     {payment.recurring_session_id && (
                                       <Repeat className="h-4 w-4 text-primary" />
                                     )}
                                   </div>
                                   <div className="text-sm text-muted-foreground space-y-1">
                                     <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                       <div className="flex items-center gap-1">
                                         <Calendar className="w-4 h-4 shrink-0" />
                                         {payment.type === 'package' ? (
                                           <span>
                                             {payment.package_data_inicio && payment.package_data_fim ? (
                                               `${formatDateBR(payment.package_data_inicio)} - ${formatDateBR(payment.package_data_fim)}`
                                             ) : (
                                               formatDateBR(payment.date)
                                             )}
                                           </span>
                                         ) : (
                                           <span>{formatDateBR(payment.date)}</span>
                                         )}
                                       </div>
                                       {payment.type !== 'package' && (
                                         <div className="flex items-center gap-1">
                                           <Clock className="w-4 h-4 shrink-0" />
                                           <span>{formatTimeBR(payment.time)}</span>
                                         </div>
                                       )}
                                     </div>
                                     <div className="flex items-center gap-2">
                                       <span className="font-medium text-primary">
                                         {formatCurrencyBR(payment.value)}
                                       </span>
                                       {payment.type === 'package' && (
                                         <span className="text-xs text-muted-foreground">
                                           {payment.package_name} • {payment.package_sessions} sessões
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                        )
                       })}
                    </div>
                  </div>
                )}

                {/* Pagamentos de Sessões Passadas */}
                {pastPayments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px bg-border flex-1" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Pagamentos de Sessões Passadas
                      </h3>
                      <div className="h-px bg-border flex-1" />
                    </div>
                    <div className="space-y-4">
                       {pastPayments.map((payment) => {
                   const StatusIcon = getStatusIcon(payment.status)
                   
                   // Lógica de needsAttention unificada
                   const needsAttention = isOverdue(payment.raw)
                   
                    return (
                    <div 
                      key={payment.id} 
                      className={cn(
                        "border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
                      )}
                      onClick={() => {
                        if (isSelectionMode) {
                          togglePaymentSelection(payment.id)
                        } else {
                          setSelectedPayment(payment)
                          setDetailsModalOpen(true)
                          if (payment.id) {
                            setViewedPaymentIds(prev => new Set([...prev, payment.id]))
                          }
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {isSelectionMode && (
                            <SelectableItemCheckbox
                              isSelected={selectedPayments.has(payment.id)}
                              onSelect={() => togglePaymentSelection(payment.id)}
                            />
                          )}
                          {!isSelectionMode && needsAttention && (
                            <div className="absolute top-4 left-4">
                              <PulsingDot color="destructive" size="md" />
                            </div>
                          )}
                          <ClientAvatar 
                            avatarPath={payment.client_avatar}
                            clientName={payment.client || 'Cliente'}
                            size="lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-base md:text-lg font-semibold">{payment.client}</h3>
                              <Badge variant={getStatusColor(payment.status)}>
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </Badge>
                              {payment.google_sync_type && (
                                <GoogleSyncBadge syncType={payment.google_sync_type} />
                              )}
                              {payment.type === 'package' && (
                                <Package className="h-4 w-4 text-primary" />
                              )}
                              {payment.recurring_session_id && (
                                <Repeat className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 shrink-0" />
                                  {payment.type === 'package' ? (
                                    <span>
                                      {payment.package_data_inicio && payment.package_data_fim ? (
                                        `${formatDateBR(payment.package_data_inicio)} - ${formatDateBR(payment.package_data_fim)}`
                                      ) : (
                                        formatDateBR(payment.date)
                                      )}
                                    </span>
                                  ) : (
                                    <span>{formatDateBR(payment.date)}</span>
                                  )}
                                </div>
                                {payment.type !== 'package' && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 shrink-0" />
                                    <span>{formatTimeBR(payment.time)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary">
                                  {formatCurrencyBR(payment.value)}
                                </span>
                                {payment.type === 'package' && (
                                  <span className="text-xs text-muted-foreground">
                                    {payment.package_name} • {payment.package_sessions} sessões
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <PaymentMethodModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onConfirm={handlePaymentConfirm}
        />

        <PaymentDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          payment={selectedPayment}
          onGenerateReceipt={handleGenerateReceipt}
          onViewSession={handleViewSession}
          onMarkAsPaid={handleMarkAsPaidFromModal}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />
      </div>
    </Layout>
  )
}

export default Pagamentos