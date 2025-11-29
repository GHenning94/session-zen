import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  Users, 
  CreditCard, 
  BarChart3, 
  FileText, 
  Settings, 
  AlertTriangle,
  LogOut,
  Activity,
  DollarSign,
  UserCheck,
  TrendingUp
} from "lucide-react"

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats] = useState({
    totalUsers: 127,
    activeUsers: 98,
    totalRevenue: 45780.50,
    pendingPayments: 12,
    criticalAlerts: 2,
    systemHealth: "Excelente"
  })

  const handleLogout = () => {
    localStorage.removeItem('admin_session_token')
    localStorage.removeItem('admin_user_id')
    localStorage.removeItem('admin_session_expires')
    toast.success('Logout realizado com sucesso')
    navigate('/admin/login')
  }

  const quickActions = [
    { title: "Criptografia e Segurança", icon: Shield, path: "/admin/security", color: "text-red-600" },
    { title: "Usuários", icon: Users, path: "/admin/users", color: "text-blue-600" },
    { title: "Pagamentos", icon: CreditCard, path: "/admin/payments", color: "text-green-600" },
    { title: "Analytics", icon: BarChart3, path: "/admin/analytics", color: "text-purple-600" },
    { title: "Conteúdo", icon: FileText, path: "/admin/content", color: "text-orange-600" },
    { title: "Configurações", icon: Settings, path: "/admin/settings", color: "text-gray-600" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground mt-1">TherapyPro - Gestão Completa</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Usuários
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <UserCheck className="inline h-3 w-3 mr-1" />
                {stats.activeUsers} ativos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </CardDescription>
              <CardTitle className="text-3xl">R$ {stats.totalRevenue.toLocaleString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +18% este mês
              </p>
            </CardContent>
          </Card>

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
                Requer atenção
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
              <p className="text-sm text-red-600">
                Ação imediata necessária
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Saúde Geral</p>
                <p className="text-2xl font-bold text-green-600">{stats.systemHealth}</p>
              </div>
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Activity className="h-10 w-10 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

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
    </div>
  )
}

export default AdminDashboard