import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  CreditCard, 
  Loader2,
  RefreshCcw,
  Clock,
  XCircle,
  Users,
  HelpCircle,
  Target
} from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface RevenueStats {
  // Revenue metrics
  totalRevenue: number
  monthlyRevenue: number
  annualRevenue: number
  mrr: number
  arr: number
  
  // By plan
  revenueByPlan: {
    basico: number
    pro: number
    premium: number
  }
  
  // Subscriptions
  activeSubscriptions: number
  cancelledSubscriptions: number
  monthlySubscriptions: number
  annualSubscriptions: number
  
  // Value metrics
  ltv: number
  arpu: number
  averageSubscriptionMonths: number
  
  // History
  revenueHistory: { month: string; monthly: number; annual: number }[]
  subscriptionTrend: { month: string; active: number; cancelled: number }[]
}

const PLAN_COLORS = {
  basico: '#94a3b8',
  pro: '#3b82f6',
  premium: '#8b5cf6'
}

const AdminRevenue = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    annualRevenue: 0,
    mrr: 0,
    arr: 0,
    revenueByPlan: { basico: 0, pro: 0, premium: 0 },
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    monthlySubscriptions: 0,
    annualSubscriptions: 0,
    ltv: 0,
    arpu: 0,
    averageSubscriptionMonths: 0,
    revenueHistory: [],
    subscriptionTrend: []
  })

  useEffect(() => {
    fetchRevenueData()
  }, [period])

  const fetchRevenueData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-revenue-stats', { period: parseInt(period) })

      if (error) throw error

      setStats({
        totalRevenue: data.totalRevenue || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        annualRevenue: data.annualRevenue || 0,
        mrr: data.mrr || 0,
        arr: data.arr || 0,
        revenueByPlan: data.revenueByPlan || { basico: 0, pro: 0, premium: 0 },
        activeSubscriptions: data.activeSubscriptions || 0,
        cancelledSubscriptions: data.cancelledSubscriptions || 0,
        monthlySubscriptions: data.monthlySubscriptions || 0,
        annualSubscriptions: data.annualSubscriptions || 0,
        ltv: data.ltv || 0,
        arpu: data.arpu || 0,
        averageSubscriptionMonths: data.averageSubscriptionMonths || 0,
        revenueHistory: data.revenueHistory || [],
        subscriptionTrend: data.subscriptionTrend || []
      })
    } catch (error: any) {
      console.error('[AdminRevenue] Error:', error)
      toast.error('Erro ao carregar dados de receita')
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

  const planDistributionData = [
    { name: 'Básico', value: stats.revenueByPlan.basico, color: PLAN_COLORS.basico },
    { name: 'Pro', value: stats.revenueByPlan.pro, color: PLAN_COLORS.pro },
    { name: 'Premium', value: stats.revenueByPlan.premium, color: PLAN_COLORS.premium },
  ].filter(p => p.value > 0)

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              Receita & Assinaturas
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Métricas financeiras e análise de assinaturas
              <UITooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    <strong>LTV</strong> = Lifetime Value (Valor Vitalício do Cliente)<br/>
                    <strong>ARPU</strong> = Average Revenue Per User
                  </p>
                </TooltipContent>
              </UITooltip>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchRevenueData} variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="MRR"
            value={formatCurrency(stats.mrr)}
            tooltip="Monthly Recurring Revenue - Receita mensal recorrente"
            icon={TrendingUp}
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="ARR"
            value={formatCurrency(stats.arr)}
            tooltip="Annual Recurring Revenue - MRR × 12"
            icon={Calendar}
            borderColor="border-l-emerald-500"
          />
          <MetricCard
            title="LTV Médio"
            value={formatCurrency(stats.ltv)}
            tooltip="Lifetime Value - Valor médio que um cliente gera durante todo o período como assinante"
            icon={Target}
            borderColor="border-l-blue-500"
          />
          <MetricCard
            title="ARPU"
            value={formatCurrency(stats.arpu)}
            tooltip="Average Revenue Per User - Receita média por usuário pagante"
            icon={Users}
            borderColor="border-l-purple-500"
          />
        </div>

        {/* Revenue by Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Receita Total (Período)"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="Assinaturas Mensais"
            value={formatCurrency(stats.monthlyRevenue)}
            description={`${stats.monthlySubscriptions} assinaturas`}
            icon={Calendar}
            borderColor="border-l-blue-500"
          />
          <MetricCard
            title="Assinaturas Anuais"
            value={formatCurrency(stats.annualRevenue)}
            description={`${stats.annualSubscriptions} assinaturas`}
            icon={Calendar}
            borderColor="border-l-purple-500"
          />
        </div>

        {/* Subscriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Assinaturas Ativas"
            value={stats.activeSubscriptions}
            icon={CreditCard}
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="Cancelamentos"
            value={stats.cancelledSubscriptions}
            description="No período selecionado"
            icon={XCircle}
            borderColor="border-l-red-500"
          />
          <MetricCard
            title="Tempo Médio de Assinatura"
            value={`${stats.averageSubscriptionMonths.toFixed(1)} meses`}
            tooltip="Média de tempo que os clientes permanecem como assinantes"
            icon={Clock}
            borderColor="border-l-amber-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Histórico de Receita
              </CardTitle>
              <CardDescription>Receita mensal vs anual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `R$${v/1000}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'monthly' ? 'Mensal' : 'Anual'
                      ]}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Legend formatter={(value) => value === 'monthly' ? 'Mensal' : 'Anual'} />
                    <Bar dataKey="monthly" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="annual" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
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
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS.basico }}></div>
                  <span className="text-sm">Básico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS.pro }}></div>
                  <span className="text-sm">Pro</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS.premium }}></div>
                  <span className="text-sm">Premium</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Tendência de Assinaturas
            </CardTitle>
            <CardDescription>Assinaturas ativas vs canceladas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.subscriptionTrend}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="active" name="Ativas" stroke="#22c55e" fill="url(#colorActive)" />
                  <Area type="monotone" dataKey="cancelled" name="Canceladas" stroke="#ef4444" fill="url(#colorCancelled)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Legends */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Glossário de Termos Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div><strong>MRR</strong>: Monthly Recurring Revenue - soma de todas as assinaturas ativas normalizada para um mês</div>
              <div><strong>ARR</strong>: Annual Recurring Revenue - MRR multiplicado por 12</div>
              <div><strong>LTV</strong>: Lifetime Value - receita média gerada por um cliente durante toda sua vida como assinante</div>
              <div><strong>ARPU</strong>: Average Revenue Per User - receita média por usuário pagante</div>
              <div><strong>Tempo Médio</strong>: Média de meses que os clientes permanecem ativos</div>
              <div><strong>Churn</strong>: Taxa de cancelamento mensal</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminRevenue
