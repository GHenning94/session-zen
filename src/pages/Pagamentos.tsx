import { useState, useEffect } from "react"
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
  Smartphone
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"

const Pagamentos = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentPlan, hasFeature } = useSubscription()
  const [filterPeriod, setFilterPeriod] = useState("todos")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [sessions, setSessions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
      
      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
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
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente não encontrado'
  }

  const getSessionPayments = () => {
    return sessions.map(session => ({
      id: session.id,
      client: getClientName(session.client_id),
      date: session.data,
      time: session.horario,
      value: session.valor || 0,
      status: session.status === 'realizada' ? 'pago' : 'pendente',
      method: 'dinheiro',
      session_id: session.id
    }))
  }

  const markAsPaid = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'realizada' })
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

  const payments = getSessionPayments()
  const filteredPayments = filterByPeriod(payments).filter(payment => 
    filterStatus === "todos" || payment.status === filterStatus
  )

  const totalReceived = filteredPayments
    .filter(p => p.status === 'pago')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const totalPending = filteredPayments
    .filter(p => p.status === 'pendente')
    .reduce((sum, p) => sum + (p.value || 0), 0)

  const paidCount = filteredPayments.filter(p => p.status === 'pago').length
  const pendingCount = filteredPayments.filter(p => p.status === 'pendente').length
  const lateCount = filteredPayments.filter(p => {
    const paymentDate = new Date(p.date)
    const now = new Date()
    return p.status === 'pendente' && paymentDate < now
  }).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'default'
      case 'pendente': return 'secondary'
      case 'atrasado': return 'destructive'
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                R$ {totalReceived.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{paidCount} pagamentos confirmados</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                R$ {totalPending.toFixed(2)}
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
                  const isLate = payment.status === 'pendente' && new Date(payment.date) < new Date()
                  
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                          <StatusIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{payment.client}</p>
                            <Badge variant={getStatusColor(isLate ? 'atrasado' : payment.status)} className="text-xs">
                              {isLate ? 'Atrasado' : payment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(payment.date).toLocaleDateString('pt-BR')} às {payment.time}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">R$ {payment.value?.toFixed(2) || '0,00'}</p>
                          <p className="text-xs text-muted-foreground">{payment.method}</p>
                        </div>
                        
                        {payment.status === 'pendente' && (
                          <Button 
                            size="sm" 
                            onClick={() => markAsPaid(payment.session_id)}
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
                                onClick={() => {
                                  // Implementar geração de recibo PDF
                                  console.log('Gerando recibo PDF para:', payment.id)
                                  alert('Funcionalidade de recibo PDF será implementada em breve!')
                                }}
                              >
                                <Receipt className="w-4 h-4 mr-2" />
                                Gerar Recibo PDF
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Receipt className="w-4 h-4 mr-2" />
                                Recibo PDF (Premium)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => {
                                // Navegar para a sessão específica
                                console.log('Visualizando sessão:', payment.session_id)
                                alert('Funcionalidade de visualizar sessão será implementada em breve!')
                              }}
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
            )}
          </CardContent>
        </Card>

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
                    <span className="font-bold">R$ {totalReceived.toFixed(2)}</span>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Dinheiro</span>
                    </div>
                    <span className="font-bold">{paidCount} pagamentos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      <span className="text-sm">Pix</span>
                    </div>
                    <span className="font-bold">0 pagamentos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Cartão</span>
                    </div>
                    <span className="font-bold">0 pagamentos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Pagamentos