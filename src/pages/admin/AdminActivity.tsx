import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Activity, Users, UserCheck, Clock, TrendingUp, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ActivityLog {
  id: string
  action: string
  table_name: string
  created_at: string
  user_email: string
  record_id: string
}

const AdminActivity = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState({
    totalActions: 0,
    uniqueUsers: 0,
    actionsLast24h: 0,
    mostActiveTable: ''
  })

  useEffect(() => {
    loadActivityData()
  }, [])

  const loadActivityData = async () => {
    try {
      const sessionToken = localStorage.getItem('admin_session_token')
      
      const { data, error } = await supabase.functions.invoke('admin-get-logs', {
        body: { sessionToken },
      })

      if (error || !data.success) {
        throw new Error(data?.error || 'Erro ao carregar atividades')
      }

      const logs = data.logs || []
      setActivityLogs(logs.slice(0, 50)) // Últimas 50 atividades

      // Calcular estatísticas
      const last24h = logs.filter((log: ActivityLog) => {
        const logDate = new Date(log.created_at)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return logDate > dayAgo
      }).length

      const uniqueUsers = new Set(logs.map((log: ActivityLog) => log.user_email)).size

      const tableCounts = logs.reduce((acc: Record<string, number>, log: ActivityLog) => {
        acc[log.table_name] = (acc[log.table_name] || 0) + 1
        return acc
      }, {})

      const mostActive = Object.entries(tableCounts).length > 0 
        ? Object.entries(tableCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] 
        : 'N/A'

      setStats({
        totalActions: logs.length,
        uniqueUsers,
        actionsLast24h: last24h,
        mostActiveTable: mostActive
      })

    } catch (error: any) {
      console.error('[Admin Activity] Error:', error)
      toast.error(error.message || 'Erro ao carregar atividades')
    } finally {
      setIsLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
        return <Badge className="bg-green-600">Criar</Badge>
      case 'UPDATE':
        return <Badge className="bg-blue-600">Atualizar</Badge>
      case 'DELETE':
        return <Badge className="bg-red-600">Deletar</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Atividades do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore todas as ações realizadas na plataforma
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions}</div>
              <p className="text-xs text-muted-foreground">Todas as operações</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">Usuários únicos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.actionsLast24h}</div>
              <p className="text-xs text-muted-foreground">Ações recentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tabela Mais Ativa</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{stats.mostActiveTable}</div>
              <p className="text-xs text-muted-foreground">Mais operações</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Atividades</CardTitle>
            <CardDescription>
              Últimas 50 ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Registro ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{log.user_email || 'Sistema'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.record_id?.substring(0, 8)}...
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 py-8">
                          <AlertCircle className="h-8 w-8" />
                          <p>Nenhuma atividade registrada</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminActivity
