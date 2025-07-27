import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BarChart3
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Layout } from "@/components/Layout"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { NewSessionModal } from "@/components/NewSessionModal"
import { UpgradePlanCard } from "@/components/UpgradePlanCard"

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    sessionsToday: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    completionRate: 94
  })
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [userPlan, setUserPlan] = useState('basico')
  const [recentClients, setRecentClients] = useState<any[]>([])
  const [monthlyChart, setMonthlyChart] = useState<any[]>([])
  const [dynamicReminders, setDynamicReminders] = useState<any[]>([])
  const [chartPeriod, setChartPeriod] = useState<'3' | '6' | '12'>('6')

  useEffect(() => {
    console.log('🎯 useEffect principal disparado, user:', user?.id)
    if (user) {
      console.log('👤 Usuário encontrado, carregando dados...')
      loadDashboardData()
    }
  }, [user, chartPeriod])

  // Force reload when component mounts
  useEffect(() => {
    console.log('🔄 useEffect de força disparado')
    if (user) {
      console.log('⚡ Forçando reload em 100ms...')
      setTimeout(() => {
        console.log('⚡ Executando reload forçado agora')
        loadDashboardData()
      }, 100)
    }
  }, [])

  // Recarregar dados quando há mudanças
  useEffect(() => {
    const handleStorageChange = () => {
      if (user) {
        loadDashboardData()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      console.log('🔄 Carregando dados do dashboard...')
      
      // Carregar plano do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('user_id', user?.id)
        .single()

      if (profileData?.subscription_plan) {
        setUserPlan(profileData.subscription_plan)
      }

      // Carregar sessões de hoje
      const today = new Date().toISOString().split('T')[0]
      console.log('📅 Data de hoje:', today)
      
      const { data: todaySessions } = await supabase
        .from('sessions')
        .select('*, clients(nome)')
        .eq('user_id', user?.id)
        .eq('data', today)
        .order('horario')
      
      console.log('📊 Sessões de hoje:', todaySessions)

      // Carregar total de clientes ativos
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      // Carregar receita do mês atual
      const currentMonth = new Date().toISOString().slice(0, 7)
      console.log('📊 Mês atual para receita:', currentMonth)
      
      // Calcular primeiro dia do próximo mês para usar como limite superior
      const currentDate = new Date()
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      const nextMonthStr = nextMonth.toISOString().slice(0, 10)
      
      const { data: monthlyPayments } = await supabase
        .from('sessions')
        .select('valor')
        .eq('user_id', user?.id)
        .eq('status', 'realizada')
        .gte('data', `${currentMonth}-01`)
        .lt('data', nextMonthStr)

      console.log('💰 Pagamentos mensais encontrados:', monthlyPayments)
      const monthlyRevenue = monthlyPayments?.reduce((sum, session) => sum + (session.valor || 0), 0) || 0
      console.log('💰 Receita mensal calculada:', monthlyRevenue)

      // Carregar próximas sessões (apenas futuras - hoje em diante)
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const currentTime = now.toTimeString().slice(0, 5)
      
      const { data: upcomingData } = await supabase
        .from('sessions')
        .select('*, clients(nome)')
        .eq('user_id', user?.id)
        .eq('status', 'agendada')
        .or(`data.gt.${todayStr},and(data.eq.${todayStr},horario.gt.${currentTime})`)
        .order('data')
        .order('horario')
        .limit(4)

      // Carregar pagamentos recentes
      const { data: paymentsData } = await supabase
        .from('sessions')
        .select('*, clients(nome)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(4)

      // Carregar clientes recentes
      const { data: recentClientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Dados do gráfico mensal baseado no período selecionado
      const periodMonths = parseInt(chartPeriod)
      console.log('📊 Período do gráfico:', periodMonths, 'meses')
      const chartData = []
      for (let i = periodMonths - 1; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStr = date.toISOString().slice(0, 7)
        console.log('📅 Processando mês:', monthStr)
        
        // Calcular primeiro dia do próximo mês para este mês específico
        const nextMonthDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)
        const nextMonthStr = nextMonthDate.toISOString().slice(0, 10)
        
        const { data: monthSessions } = await supabase
          .from('sessions')
          .select('valor')
          .eq('user_id', user?.id)
          .eq('status', 'realizada')
          .gte('data', `${monthStr}-01`)
          .lt('data', nextMonthStr)
        
        console.log(`💰 Sessões do mês ${monthStr}:`, monthSessions)
        const revenue = monthSessions?.reduce((sum, session) => sum + (session.valor || 0), 0) || 0
        console.log(`💰 Receita do mês ${monthStr}:`, revenue)
        chartData.push({
          mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
          receita: revenue,
          fullMonth: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        })
      }
      console.log('📊 Dados finais do gráfico:', chartData)

      // Gerar lembretes dinâmicos (apenas eventos futuros)
      const reminders = []
      
      // Próximas sessões (apenas futuras)
      if (upcomingData && upcomingData.length > 0) {
        const nextSession = upcomingData[0]
        const sessionDate = new Date(nextSession.data)
        const sessionTime = new Date(`${nextSession.data}T${nextSession.horario}`)
        const isToday = sessionDate.toDateString() === now.toDateString()
        
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

      setDashboardData({
        sessionsToday: todaySessions?.length || 0,
        activeClients: clientsCount || 0,
        monthlyRevenue,
        completionRate: 94
      })

      setUpcomingSessions(upcomingData || [])
      setRecentPayments(paymentsData || [])
      setRecentClients(recentClientsData || [])
      setMonthlyChart(chartData)
      setDynamicReminders(reminders)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    }
  }

  const handlePeriodChange = async (period: '3' | '6' | '12') => {
    console.log('📊 Mudando período para:', period)
    setChartPeriod(period)
  }

  const handleNewSession = () => {
    setIsNewSessionOpen(true)
  }

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
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      title: "Receita Mensal",
      value: `R$ ${dashboardData.monthlyRevenue.toFixed(2)}`,
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta! Aqui está um resumo do seu dia.
            </p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90" onClick={handleNewSession}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
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
            <CardContent>
              <div className="space-y-4">
                {upcomingSessions.length > 0 ? upcomingSessions.map((session, index) => (
                  <div key={session.id || index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-card rounded-full flex items-center justify-center">
                       <span className="text-sm font-medium text-primary">
                           {session.clients?.nome ? session.clients.nome.split(' ').map((n: string) => n[0]).join('') : 'CL'}
                         </span>
                       </div>
                       <div>
                         <p className="font-medium">{session.clients?.nome || 'Cliente'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(`2000-01-01T${session.horario}`).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                     <div className="text-right">
                       <p className="font-medium">{new Date(session.data).toLocaleDateString('pt-BR')}</p>
                       <Badge 
                         variant={session.status === 'concluida' ? 'default' : 'secondary'}
                         className="text-xs"
                       >
                         {session.status || 'agendada'}
                       </Badge>
                     </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">Nenhuma sessão agendada</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos Recentes */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-secondary" />
                Pagamentos Recentes
              </CardTitle>
              <CardDescription>
                Últimas transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPayments.length > 0 ? recentPayments.map((payment, index) => (
                  <div key={payment.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                     <div>
                       <p className="font-medium text-sm">{payment.clients?.nome || 'Cliente'}</p>
                       <p className="text-xs text-muted-foreground">
                         {new Date(payment.data).toLocaleDateString('pt-BR')}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="font-medium text-sm">R$ {payment.valor?.toFixed(2) || '0,00'}</p>
                       <Badge 
                         variant={payment.status === 'concluida' ? 'default' : 'destructive'}
                         className="text-xs"
                       >
                         {payment.status || 'agendada'}
                       </Badge>
                     </div>
                  </div>
                )) : (
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
                  <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={() => navigate("/clientes")}>
                    <Users className="w-6 h-6 text-secondary" />
                    <span>Adicionar Cliente</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={() => navigate("/pagamentos")}>
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
                          <BarChart data={monthlyChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="mes" 
                              fontSize={12} 
                              axisLine={false}
                              tickLine={false}
                              className="text-muted-foreground"
                            />
                            <YAxis 
                              fontSize={12} 
                              axisLine={false}
                              tickLine={false}
                              className="text-muted-foreground"
                              tickFormatter={(value) => `R$ ${value}`}
                            />
                            <Tooltip 
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                              labelFormatter={(label: string, payload: any[]) => {
                                const item = payload?.[0]?.payload
                                return item ? `${item.fullMonth}` : label
                              }}
                              contentStyle={{
                                background: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Bar 
                              dataKey="receita" 
                              fill="hsl(var(--primary))" 
                              radius={[4, 4, 0, 0]}
                              className="opacity-80 hover:opacity-100"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Estatísticas do período */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            R$ {monthlyChart.reduce((sum, item) => sum + item.receita, 0).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">Total do Período</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-secondary">
                            R$ {monthlyChart.length > 0 ? (monthlyChart.reduce((sum, item) => sum + item.receita, 0) / monthlyChart.length).toFixed(2) : '0.00'}
                          </p>
                          <p className="text-sm text-muted-foreground">Média Mensal</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">
                            R$ {monthlyChart.length > 0 ? Math.max(...monthlyChart.map(item => item.receita)).toFixed(2) : '0.00'}
                          </p>
                          <p className="text-sm text-muted-foreground">Melhor Mês</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Clientes Recentes */}
                <div className="col-span-full">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-secondary" />
                        Clientes Recentes
                      </CardTitle>
                      <CardDescription>
                        Últimos clientes adicionados ao sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentClients.length > 0 ? recentClients.slice(0, 6).map((client, index) => (
                          <div key={client.id || index} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {client.nome ? client.nome.split(' ').map((n: string) => n[0]).join('') : 'CL'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(client.created_at).toLocaleDateString('pt-BR')}
                              </p>
                              {client.telefone && (
                                <p className="text-xs text-muted-foreground truncate">{client.telefone}</p>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full text-center py-8">
                            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhum cliente adicionado ainda</p>
                            <Button variant="outline" className="mt-2" onClick={() => navigate("/clientes")}>
                              Adicionar Primeiro Cliente
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade de Plano */}
          <UpgradePlanCard currentPlan={userPlan} />
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

      <NewSessionModal 
        open={isNewSessionOpen}
        onOpenChange={setIsNewSessionOpen}
        onSessionCreated={loadDashboardData}
      />
    </Layout>
  )
}

export default Dashboard