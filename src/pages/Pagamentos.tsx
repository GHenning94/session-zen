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
  MoreHorizontal,
  Receipt,
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { generateReceiptPDF } from "@/utils/receiptGenerator"
import { useNavigate } from 'react-router-dom'
import PaymentMethodModal from "@/components/PaymentMethodModal"
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
  const [sessions, setSessions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
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
      
      return {
        id: session.id,
        client: getClientName(session.client_id),
        date: session.data,
        time: session.horario,
        value: session.valor || 0,
        status: status,
        method: session.metodo_pagamento || 'dinheiro',
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

  // Filtrar e ordenar pagamentos
  const allPayments = getSessionPayments()
  const filteredPayments = filterByPeriod(allPayments).filter(payment => 
    filterStatus === "todos" || payment.status === filterStatus
  ).sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`)
    const dateB = new Date(`${b.date} ${b.time}`)
    return dateB.getTime() - dateA.getTime()
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
      case 'pago': return 'default'
      case 'pendente': return 'secondary'
      case 'atrasado': return 'destructive'
      case 'cancelado': return 'destructive'
      default: return 'secondary'
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
              <div className="text-2xl font-bold" style={{ color: 'hsl(142 71% 45%)' }}>
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
              <div className="text-2xl font-bold text-destructive">{lateCount}</div>
              <p className="text-sm text-muted-foreground">Pagamentos atrasados</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{cancelledCount}</div>
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
                {paidCount > 0 ? ((paidCount / (paidCount + pendingCount)) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Pagamentos em dia</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Período:</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
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
            <Collapsible open={activePaymentsExpanded} onOpenChange={setActivePaymentsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <div className="flex items-center gap-2">
                    {activePaymentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle>Histórico de Pagamentos</CardTitle>
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardDescription className="mt-2">
                  {filteredActivePayments.length} pagamento(s) ativo(s) encontrado(s)
                </CardDescription>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando pagamentos...</p>
              </div>
            ) : filteredActivePayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pagamento encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivePayments.map((payment) => {
                   const StatusIcon = getStatusIcon(payment.status)
                   
                   return (
                   <div key={payment.id} className={cn(
                     "flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors",
                     highlightedPaymentId === payment.session_id && "animate-pulse bg-primary/10 border-primary"
                   )}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                          <StatusIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{payment.client}</p>
                           <Badge variant={getStatusColor(payment.status)} className="text-xs">
                             {payment.status === 'pago' ? 'Pago' : payment.status === 'atrasado' ? 'Atrasado' : payment.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                           </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateBR(payment.date)} às {formatTimeBR(payment.time)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrencyBR(payment.value)}</p>
                          <p className="text-xs text-muted-foreground">{payment.method}</p>
                        </div>
                        
                        {(payment.status === 'pendente' || payment.status === 'atrasado') && (
                          <Button 
                            size="sm" 
                            onClick={() => openPaymentModal(payment.session_id)}
                            className="bg-gradient-primary hover:opacity-90"
                            disabled={isLoading}
                          >
                            Marcar como Pago
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-background border shadow-lg z-50">
                            {hasFeature('hasPDFReports') ? (
                              <DropdownMenuItem 
                                onClick={() => generateReceipt(payment)}
                                disabled={payment.status !== 'pago'}
                              >
                                <Receipt className="w-4 h-4 mr-2" />
                                {payment.status === 'pago' ? 'Exportar Recibo PDF' : 'Recibo PDF (Marque como pago)'}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Receipt className="w-4 h-4 mr-2" />
                                Recibo PDF (Premium)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => viewSession(payment.session_id)}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Ver Sessão
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}

                {/* Separador para Pagamentos Cancelados */}
                {filteredCancelledPayments.length > 0 && (
                  <Collapsible open={false} onOpenChange={() => {}}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto py-6">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">Pagamentos Cancelados ({filteredCancelledPayments.length})</h3>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-4 mt-4">
                    
                    {filteredCancelledPayments.map((payment) => {
                       const StatusIcon = getStatusIcon(payment.status)
                       
                       return (
                       <div key={payment.id} className={cn(
                         "flex items-center justify-between p-4 border border-border rounded-lg opacity-75",
                         highlightedPaymentId === payment.session_id && "animate-pulse bg-primary/10 border-primary"
                       )}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                              <StatusIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-muted-foreground">{payment.client}</p>
                                <Badge variant="destructive" className="text-xs">
                                  Cancelado
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDateBR(payment.date)} às {formatTimeBR(payment.time)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg text-muted-foreground">{formatCurrencyBR(payment.value)}</p>
                              <p className="text-xs text-muted-foreground">{payment.method}</p>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-background border shadow-lg z-50">
                                <DropdownMenuItem 
                                  onClick={() => viewSession(payment.session_id)}
                                >
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Ver Sessão
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                   )
                 })}
                       </div>
                     </CollapsibleContent>
                   </Collapsible>
                 )}
               </div>
             )}
           </CardContent>
         </Card>

         {/* Cancelled Payments */}
         {filteredCancelledPayments.length > 0 && (
           <Card className="shadow-soft">
             <CardHeader>
               <Collapsible open={cancelledPaymentsExpanded} onOpenChange={setCancelledPaymentsExpanded}>
                 <CollapsibleTrigger asChild>
                   <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                     <div className="flex items-center gap-2">
                       {cancelledPaymentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                       <CardTitle>Pagamentos Cancelados</CardTitle>
                     </div>
                   </Button>
                 </CollapsibleTrigger>
                 <CollapsibleContent>
                   <CardDescription className="mt-2">
                     {filteredCancelledPayments.length} pagamento(s) cancelado(s)
                   </CardDescription>
                 </CollapsibleContent>
               </Collapsible>
             </CardHeader>
             <CardContent>
               {isLoading ? (
                 <div className="text-center py-8">
                   <p className="text-muted-foreground">Carregando pagamentos...</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <Collapsible open={cancelledPaymentsExpanded} onOpenChange={setCancelledPaymentsExpanded}>
                     <CollapsibleContent>
                       <div className="space-y-4">
                         {filteredCancelledPayments.map((payment) => {
                            const StatusIcon = getStatusIcon(payment.status)
                            
                            return (
                            <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/20">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                                   <StatusIcon className="w-5 h-5 text-muted-foreground" />
                                 </div>
                                 <div>
                                   <div className="flex items-center gap-2">
                                     <p className="font-medium text-muted-foreground">{payment.client}</p>
                                     <Badge variant="destructive" className="text-xs">
                                       Cancelado
                                     </Badge>
                                   </div>
                                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                     <Calendar className="w-3 h-3" />
                                     <span>{formatDateBR(payment.date)} às {formatTimeBR(payment.time)}</span>
                                   </div>
                                 </div>
                               </div>
                               
                               <div className="flex items-center gap-4">
                                 <div className="text-right">
                                   <p className="font-bold text-lg text-muted-foreground">{formatCurrencyBR(payment.value)}</p>
                                   <p className="text-xs text-muted-foreground">{payment.method}</p>
                                 </div>
                                 
                                 <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-8 w-8">
                                       <MoreHorizontal className="w-4 h-4" />
                                     </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent className="bg-background border shadow-lg z-50">
                                     <DropdownMenuItem 
                                       onClick={() => viewSession(payment.session_id)}
                                     >
                                       <Calendar className="w-4 h-4 mr-2" />
                                       Ver Sessão
                                     </DropdownMenuItem>
                                   </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                         </div>
                        )
                      })}
                       </div>
                     </CollapsibleContent>
                   </Collapsible>
                 </div>
               )}
             </CardContent>
           </Card>
         )}

        {/* Payment Methods Summary */}
        {hasFeature('hasHistory') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Resumo Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Janeiro 2024</span>
                    <span className="font-bold">{formatCurrencyBR(totalReceived)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Meta: R$ 5.000,00 ({((totalReceived / 5000) * 100).toFixed(1)}%)
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Métodos de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const methodCounts = {
                      dinheiro: 0,
                      pix: 0,
                      cartao: 0,
                      transferencia: 0
                    };
                     
                     filteredActivePayments
                       .filter(p => p.status === 'pago')
                       .forEach(p => {
                        const method = p.method || 'dinheiro';
                        if (methodCounts[method as keyof typeof methodCounts] !== undefined) {
                          methodCounts[method as keyof typeof methodCounts]++;
                        }
                      });

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4" />
                            <span className="text-sm">Dinheiro</span>
                          </div>
                          <span className="font-bold">{methodCounts.dinheiro} pagamentos</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            <span className="text-sm">PIX</span>
                          </div>
                          <span className="font-bold">{methodCounts.pix} pagamentos</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span className="text-sm">Cartão</span>
                          </div>
                          <span className="font-bold">{methodCounts.cartao} pagamentos</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="text-sm">Transferência</span>
                          </div>
                          <span className="font-bold">{methodCounts.transferencia} pagamentos</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onConfirm={handlePaymentConfirm}
        loading={isLoading}
      />
    </Layout>
  )
}

export default Pagamentos