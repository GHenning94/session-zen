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
  UserPlus
} from "lucide-react"
import { toast } from "sonner"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  pendingPayments: number
  criticalAlerts: number
  systemHealth: string
  totalSessions: number
  totalClients: number
  newUsers30d: number
  sessionsCompleted30d: number
  revenue30d: number
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    criticalAlerts: 0,
    systemHealth: "Carregando...",
    totalSessions: 0,
    totalClients: 0,
    newUsers30d: 0,
    sessionsCompleted30d: 0,
    revenue30d: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(
        `https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/admin-get-dashboard-stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4',
          },
          credentials: 'include', // Include httpOnly cookie
          body: JSON.stringify({}),
        }
      )

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao carregar dados')
      }

      setStats({
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        totalRevenue: data.totalRevenue || 0,
        pendingPayments: data.pendingPayments || 0,
        criticalAlerts: data.criticalAlerts || 0,
        systemHealth: data.systemHealth || "Excelente",
        totalSessions: data.totalSessions || 0,
        totalClients: data.totalClients || 0,
        newUsers30d: data.newUsers30d || 0,
        sessionsCompleted30d: data.sessionsCompleted30d || 0,
        revenue30d: data.revenue30d || 0
      })
    } catch (error: any) {
      console.error('[AdminDashboard] Error fetching data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    { title: "Criptografia e Segurança", icon: Shield, path: "/admin/security", color: "text-red-600" },
    { title: "Usuários", icon: Users, path: "/admin/users", color: "text-blue-600" },
    { title: "Pagamentos", icon: CreditCard, path: "/admin/payments", color: "text-green-600" },
    { title: "Analytics", icon: BarChart3, path: "/admin/analytics", color: "text-purple-600" },
    { title: "Conteúdo", icon: FileText, path: "/admin/content", color: "text-orange-600" },
    { title: "Configurações", icon: Settings, path: "/admin/settings", color: "text-gray-600" },
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
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Status Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Usuários
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalUsers.toLocaleString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <UserPlus className="inline h-3 w-3 mr-1" />
                +{stats.newUsers30d} nos últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Total de Clientes
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalClients.toLocaleString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pacientes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Total de Sessões
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalSessions.toLocaleString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <Activity className="inline h-3 w-3 mr-1" />
                {stats.sessionsCompleted30d} realizadas (30d)
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita (30 dias)
              </CardDescription>
              <CardTitle className="text-3xl">R$ {stats.revenue30d.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards - Row 2 */}
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

          {/* System Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status do Sistema
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.systemHealth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => navigate(action.path)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                    {action.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard