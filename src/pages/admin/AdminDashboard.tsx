import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { 
  Shield, 
  Users, 
  CreditCard, 
  BarChart3, 
  FileText, 
  Settings, 
  AlertTriangle,
  Activity,
  DollarSign,
  UserCheck,
  TrendingUp,
  Loader2,
  Calendar,
  UserPlus,
  Percent,
  RefreshCcw,
  Heart,
  UserX,
  Target,
  Gift,
  Bell,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard, StatusIndicator, TermLegend } from "@/components/admin/MetricCard"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface DashboardStats {
  // Financial
  mrr: number
  arr: number
  revenue30d: number
  revenueGrowth: number
  
  // Users
  totalUsers: number
  activeUsers: number
  payingUsers: number
  newUsers30d: number
  
  // Metrics
  arpu: number
  conversionRate: number
  customerChurn: number
  revenueChurn: number
  nrr: number
  
  // Sessions
  totalSessions: number
  totalClients: number
  sessionsCompleted30d: number
  
  // System
  criticalAlerts: number
  pendingPayments: number
  systemHealth: string
  
  // Charts data
  mrrHistory: { month: string; value: number }[]
  userGrowth: { month: string; value: number }[]
  planDistribution: { name: string; value: number; color: string }[]
  revenueByPlan: { plan: string; value: number }[]
}

const PLAN_COLORS = {
  basico: '#94a3b8',
  pro: '#3b82f6',
  premium: '#8b5cf6'
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    mrr: 0,
    arr: 0,
    revenue30d: 0,
    revenueGrowth: 0,
    totalUsers: 0,
    activeUsers: 0,
    payingUsers: 0,
    newUsers30d: 0,
    arpu: 0,
    conversionRate: 0,
    customerChurn: 0,
    revenueChurn: 0,
    nrr: 0,
    totalSessions: 0,
    totalClients: 0,
    sessionsCompleted30d: 0,
    criticalAlerts: 0,
    pendingPayments: 0,
    systemHealth: "Carregando...",
    mrrHistory: [],
    userGrowth: [],
    planDistribution: [],
    revenueByPlan: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await adminApiCall('admin-get-dashboard-stats')

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao carregar dados')
      }

      setStats({
        mrr: data.mrr || 0,
        arr: data.arr || 0,
        revenue30d: data.revenue30d || 0,
        revenueGrowth: data.revenueGrowth || 0,
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        payingUsers: data.payingUsers || 0,
        newUsers30d: data.newUsers30d || 0,
        arpu: data.arpu || 0,
        conversionRate: data.conversionRate || 0,
        customerChurn: data.customerChurn || 0,
        revenueChurn: data.revenueChurn || 0,
        nrr: data.nrr || 100,
        totalSessions: data.totalSessions || 0,
        totalClients: data.totalClients || 0,
        sessionsCompleted30d: data.sessionsCompleted30d || 0,
        criticalAlerts: data.criticalAlerts || 0,
        pendingPayments: data.pendingPayments || 0,
        systemHealth: data.systemHealth || "Excelente",
        mrrHistory: data.mrrHistory || [],
        userGrowth: data.userGrowth || [],
        planDistribution: data.planDistribution || [],
        revenueByPlan: data.revenueByPlan || []
      })
    } catch (error: any) {
      console.error('[AdminDashboard] Error fetching data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const quickActions = [
    { title: "Receita & Assinaturas", icon: DollarSign, path: "/admin/revenue", color: "text-green-600" },
    { title: "Usuários & Contas", icon: Users, path: "/admin/users", color: "text-blue-600" },
    { title: "Sessões", icon: Calendar, path: "/admin/sessions", color: "text-purple-600" },
    { title: "Clientes Finais", icon: UserCheck, path: "/admin/clients", color: "text-cyan-600" },
    { title: "Programa de Indicação", icon: Gift, path: "/admin/referrals", color: "text-orange-600" },
    { title: "Alertas & Saúde", icon: Heart, path: "/admin/health", color: "text-red-600" },
  ]

  const existingPages = [
    { title: "Criptografia e Segurança", icon: Shield, path: "/admin/security", color: "text-red-600" },
    { title: "Analytics", icon: BarChart3, path: "/admin/analytics", color: "text-purple-600" },
    { title: "Conteúdo", icon: FileText, path: "/admin/content", color: "text-orange-600" },
    { title: "Logs e Auditoria", icon: AlertTriangle, path: "/admin/logs", color: "text-yellow-600" },
    { title: "Configurações", icon: Settings, path: "/admin/settings", color: "text-gray-600" },
    { title: "Roles e Permissões", icon: Shield, path: "/admin/roles", color: "text-indigo-600" },
  ]

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Carregando dados do dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Visão Geral do SaaS</h1>
            <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
              Métricas estratégicas e saúde da plataforma
              <UITooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-xs">
                    <strong>Legendas:</strong><br/>
                    <strong>MRR</strong> = Receita Mensal Recorrente<br/>
                    <strong>ARR</strong> = Receita Anual Recorrente<br/>
                    <strong>ARPU</strong> = Receita Média por Usuário<br/>
                    <strong>Churn</strong> = Taxa de cancelamento<br/>
                    <strong>NRR</strong> = Retenção de Receita Líquida
                  </p>
                </TooltipContent>
              </UITooltip>
            </p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Financial Metrics - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="MRR"
            value={formatCurrency(stats.mrr)}
            tooltip="Monthly Recurring Revenue - Receita Mensal Recorrente. É a soma de todas as assinaturas ativas normalizadas para um mês."
            icon={DollarSign}
            borderColor="border-l-green-500"
            trend={{ value: stats.revenueGrowth, label: "vs. mês anterior" }}
          />
          <MetricCard
            title="ARR"
            value={formatCurrency(stats.arr)}
            tooltip="Annual Recurring Revenue - Receita Anual Recorrente. MRR × 12."
            icon={TrendingUp}
            borderColor="border-l-emerald-500"
          />
          <MetricCard
            title="ARPU"
            value={formatCurrency(stats.arpu)}
            tooltip="Average Revenue Per User - Receita média por usuário pagante."
            icon={Target}
            borderColor="border-l-blue-500"
          />
          <MetricCard
            title="NRR"
            value={`${stats.nrr.toFixed(1)}%`}
            tooltip="Net Revenue Retention - Retenção de receita líquida. >100% significa que usuários existentes estão gerando mais receita (upgrades)."
            icon={RefreshCcw}
            borderColor="border-l-purple-500"
          />
        </div>

        {/* User Metrics - Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total de Usuários"
            value={stats.totalUsers.toLocaleString('pt-BR')}
            icon={Users}
            borderColor="border-l-blue-500"
            description={`+${stats.newUsers30d} nos últimos 30 dias`}
          />
          <MetricCard
            title="Usuários Ativos"
            value={stats.activeUsers.toLocaleString('pt-BR')}
            tooltip="Usuários com login nos últimos 30 dias"
            icon={Activity}
            borderColor="border-l-cyan-500"
          />
          <MetricCard
            title="Usuários Pagantes"
            value={stats.payingUsers.toLocaleString('pt-BR')}
            icon={CreditCard}
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="Conversão Free → Pago"
            value={`${stats.conversionRate.toFixed(1)}%`}
            tooltip="Porcentagem de usuários gratuitos que fizeram upgrade para plano pago."
            icon={Percent}
            borderColor="border-l-amber-500"
          />
          <MetricCard
            title="Churn de Clientes"
            value={`${stats.customerChurn.toFixed(1)}%`}
            tooltip="Taxa de cancelamento mensal de clientes. Quanto menor, melhor."
            icon={UserX}
            borderColor="border-l-red-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MRR Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Evolução do MRR
              </CardTitle>
              <CardDescription>Receita mensal recorrente dos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.mrrHistory}>
                    <defs>
                      <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `R$${v/1000}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'MRR']}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#22c55e" fill="url(#colorMrr)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Crescimento de Usuários
              </CardTitle>
              <CardDescription>Novos usuários por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Novos usuários']}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Distribuição por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {stats.planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, 'Usuários']}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Receita por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueByPlan} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `R$${v/1000}k`} className="text-xs" />
                    <YAxis dataKey="plan" type="category" className="text-xs" width={80} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {stats.revenueByPlan.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.plan.toLowerCase() as keyof typeof PLAN_COLORS] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagamentos Pendentes
              </CardDescription>
              <CardTitle className="text-3xl">{stats.pendingPayments}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Aguardando pagamento
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas Críticos
              </CardDescription>
              <CardTitle className="text-3xl">{stats.criticalAlerts}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm ${stats.criticalAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.criticalAlerts > 0 ? 'Ação necessária' : 'Nenhum alerta'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status do Sistema
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.systemHealth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    stats.systemHealth === 'Excelente' ? 'bg-green-500 w-full' :
                    stats.systemHealth === 'Bom' ? 'bg-green-400 w-3/4' :
                    stats.systemHealth === 'Atenção' ? 'bg-yellow-500 w-1/2' :
                    'bg-red-500 w-1/4'
                  }`}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - New Features */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Acesso Rápido - Novas Funcionalidades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => navigate(action.path)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                    {action.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Existing Pages */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Páginas Existentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingPages.map((action) => (
              <Card 
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] opacity-80"
                onClick={() => navigate(action.path)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                    {action.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Legends */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Glossário de Termos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div><strong>MRR</strong>: Receita Mensal Recorrente - soma de assinaturas ativas</div>
              <div><strong>ARR</strong>: Receita Anual Recorrente - MRR × 12</div>
              <div><strong>ARPU</strong>: Receita Média por Usuário pagante</div>
              <div><strong>Churn</strong>: Taxa de cancelamento de clientes ou receita</div>
              <div><strong>NRR</strong>: Retenção de Receita Líquida - mede crescimento de contas existentes</div>
              <div><strong>LTV</strong>: Valor Vitalício do Cliente - receita total esperada</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
