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
import { formatCurrencyBR, formatTimeBR, formatDateBR } from "@/utils/formatters"
import { calculatePaymentStatus } from "@/utils/sessionStatusUtils"
import { cn } from "@/lib/utils"

const Pagamentos = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, hasFeature } = useSubscription()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterPeriod, setFilterPeriod] = useState("todos")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterName, setFilterName] = useState("")
  const [sessions, setSessions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null)

  // Carregar dados do Supabase
  const loadData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Carregar sessões
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .order('horario', { ascending: false })
      
      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)

      // Carregar perfil do profissional
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
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
    return sessions.map(session => {
      const status = calculatePaymentStatus(session.data, session.horario, session.status)
      const client = clients.find(c => c.id === session.client_id)
      
      return {
        id: session.id,
        client: getClientName(session.client_id),
        client_avatar: client?.avatar_url,
        date: session.data,
        time: session.horario,
        value: session.valor || 0,
        status: status,
        method: session.metodo_pagamento || 'A definir',
        session_id: session.id,
        session_status: session.status
      }
    })
  }

  const markAsPaid = async (sessionId: string, paymentMethod: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'realizada',
          metodo_pagamento: paymentMethod
        })
        .eq('id', sessionId)
      
      if (error) throw error
      
      toast({
        title: "Pagamento Confirmado",
        description: "O pagamento foi marcado como recebido.",
      })
      
      await loadData()
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

  const handlePaymentConfirm = async (method: string) => {
    if (selectedSessionId) {
      await markAsPaid(selectedSessionId, method)
      setPaymentModalOpen(false)
      setSelectedSessionId(null)
    }
  }

  const filterByPeriod = (payments: any[]) => {
    if (filterPeriod === "todos") return payments
    
    const now = new Date()
    const startDate = new Date()
    
    switch (filterPeriod) {
      case "hoje":
        // Apenas hoje
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return payments.filter(payment => {
          const paymentDate = new Date(payment.date)
          paymentDate.setHours(0, 0, 0, 0)
          return paymentDate.getTime() === today.getTime()
        })
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
        return payments
    }
    
    return payments.filter(payment => {
      const paymentDate = new Date(payment.date)
      return paymentDate >= startDate && paymentDate <= now
    })
  }

  // Filtrar e ordenar pagamentos pela mais próxima (futuros primeiro, depois passados)
  const allPayments = getSessionPayments()
  const filteredPayments = filterByPeriod(allPayments).filter(payment => {
    const statusMatch = filterStatus === "todos" || payment.status === filterStatus
    const nameMatch = filterName === "" || payment.client.toLowerCase().includes(filterName.toLowerCase())
    return statusMatch && nameMatch
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

  const totalReceived = filteredPayments
    .filter(p => p.status === 'pago')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const totalPending = filteredPayments
    .filter(p => p.status === 'pendente')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const totalOverdue = filteredPayments
    .filter(p => p.status === 'atrasado')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const totalCancelled = filteredPayments
    .filter(p => p.status === 'cancelado')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const paidCount = filteredPayments.filter(p => p.status === 'pago').length
  const pendingCount = filteredPayments.filter(p => p.status === 'pendente').length
  const lateCount = filteredPayments.filter(p => p.status === 'atrasado').length
  const cancelledCount = filteredPayments.filter(p => p.status === 'cancelado').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'success'
      case 'pendente': return 'warning'
      case 'atrasado': return 'purple'
      case 'cancelado': return 'destructive'
      default: return 'warning'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago': return CheckCircle
      case 'pendente': return Clock
      case 'atrasado': return AlertCircle
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
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartao': 'Cartão',
      'transferencia': 'Transferência Bancária'
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
            <p className="text-muted-foreground">
              Gerencie os pagamentos e acompanhe seu faturamento
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrencyBR(totalReceived)}
              </div>
              <p className="text-sm text-muted-foreground">{paidCount} pagamentos confirmados</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrencyBR(totalPending)}
              </div>
              <p className="text-sm text-muted-foreground">{pendingCount} pagamentos pendentes</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--purple))]">{lateCount}</div>
              <p className="text-sm text-muted-foreground">Pagamentos atrasados</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{cancelledCount}</div>
              <p className="text-sm text-muted-foreground">{cancelledCount} pagamentos cancelados</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {(paidCount + pendingCount + lateCount) > 0 ? ((paidCount / (paidCount + pendingCount + lateCount)) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Pagamentos em dia</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Nome:</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-[200px] pl-9"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Período:</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Últimos 7 dias</SelectItem>
                    <SelectItem value="mes">Último mês</SelectItem>
                    <SelectItem value="trimestre">Último trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                     <SelectItem value="todos">Todos</SelectItem>
                     <SelectItem value="pago">Pagos</SelectItem>
                     <SelectItem value="pendente">Pendentes</SelectItem>
                     <SelectItem value="atrasado">Atrasados</SelectItem>
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
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando pagamentos...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pagamento encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => {
                   const StatusIcon = getStatusIcon(payment.status)
                   
                   return (
                   <div 
                     key={payment.id} 
                     className={cn(
                       "flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
                       highlightedPaymentId === payment.session_id && "animate-pulse bg-primary/10 border-primary"
                     )}
                     onClick={() => {
                       setSelectedPayment(payment)
                       setDetailsModalOpen(true)
                     }}
                   >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                          <StatusIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{payment.client}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDateBR(payment.date)} às {formatTimeBR(payment.time)}</span>
                            </div>
                            <Badge variant={getStatusColor(payment.status)} className="text-xs">
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-lg">{formatCurrencyBR(payment.value)}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {payment.method === 'dinheiro' && <Banknote className="w-3 h-3" />}
                            {payment.method === 'pix' && <Smartphone className="w-3 h-3" />}
                            {payment.method === 'cartao' && <CreditCard className="w-3 h-3" />}
                            {payment.method === 'transferencia' && <Building2 className="w-3 h-3" />}
                            <span className="capitalize">{payment.method}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                   )
                })}
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
        />
      </div>
    </Layout>
  )
}

export default Pagamentos