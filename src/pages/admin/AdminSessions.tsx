import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  Calendar,
  Loader2,
  RefreshCcw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertTriangle,
  MoreVertical,
  Trash2,
  Edit,
  RotateCcw
} from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface SessionStats {
  totalSessions: number
  completedSessions: number
  cancelledSessions: number
  scheduledSessions: number
  avgSessionsPerUser: number
  avgSessionsPerClient: number
}

interface Session {
  id: string
  data: string
  horario: string
  status: string
  valor: number
  client_name: string
  user_name: string
  user_email: string
  created_at: string
}

const AdminSessions = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    scheduledSessions: 0,
    avgSessionsPerUser: 0,
    avgSessionsPerClient: 0
  })
  const [sessions, setSessions] = useState<Session[]>([])
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [period, setPeriod] = useState('30')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string }>({ open: false, action: '' })

  useEffect(() => {
    fetchSessionsData()
  }, [period])

  useEffect(() => {
    filterSessions()
  }, [searchTerm, statusFilter, sessions])

  const fetchSessionsData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-sessions-stats', { period: parseInt(period) })

      if (error) throw error

      setStats({
        totalSessions: data.totalSessions || 0,
        completedSessions: data.completedSessions || 0,
        cancelledSessions: data.cancelledSessions || 0,
        scheduledSessions: data.scheduledSessions || 0,
        avgSessionsPerUser: data.avgSessionsPerUser || 0,
        avgSessionsPerClient: data.avgSessionsPerClient || 0
      })
      setSessions(data.sessions || [])
      setFilteredSessions(data.sessions || [])
    } catch (error: any) {
      console.error('[AdminSessions] Error:', error)
      toast.error('Erro ao carregar dados de sessões')
    } finally {
      setIsLoading(false)
    }
  }

  const filterSessions = () => {
    let filtered = [...sessions]
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s => 
        s.client_name?.toLowerCase().includes(term) ||
        s.user_name?.toLowerCase().includes(term) ||
        s.user_email?.toLowerCase().includes(term)
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }
    
    setFilteredSessions(filtered)
  }

  const handleAction = async (action: string) => {
    if (!selectedSession) return
    
    try {
      const { error } = await adminApiCall('admin-manage-session', {
        sessionId: selectedSession.id,
        action
      })

      if (error) throw error

      toast.success(`Sessão ${action === 'cancel' ? 'cancelada' : action === 'delete' ? 'excluída' : 'atualizada'} com sucesso`)
      fetchSessionsData()
    } catch (error: any) {
      toast.error(`Erro ao ${action === 'cancel' ? 'cancelar' : action === 'delete' ? 'excluir' : 'atualizar'} sessão`)
    } finally {
      setActionDialog({ open: false, action: '' })
      setSelectedSession(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'realizada':
        return <Badge className="bg-green-500">Realizada</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      case 'agendada':
        return <Badge className="bg-blue-500">Agendada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

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
              <Calendar className="h-8 w-8 text-purple-500" />
              Gestão de Sessões
            </h1>
            <p className="text-muted-foreground">
              Métricas globais e gerenciamento de sessões
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
            <Button onClick={fetchSessionsData} variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Total de Sessões"
            value={stats.totalSessions.toLocaleString('pt-BR')}
            icon={Calendar}
            borderColor="border-l-blue-500"
          />
          <MetricCard
            title="Realizadas"
            value={stats.completedSessions.toLocaleString('pt-BR')}
            icon={CheckCircle2}
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="Canceladas"
            value={stats.cancelledSessions.toLocaleString('pt-BR')}
            icon={XCircle}
            borderColor="border-l-red-500"
          />
          <MetricCard
            title="Agendadas"
            value={stats.scheduledSessions.toLocaleString('pt-BR')}
            icon={Clock}
            borderColor="border-l-amber-500"
          />
          <MetricCard
            title="Média por Profissional"
            value={stats.avgSessionsPerUser.toFixed(1)}
            icon={Users}
            borderColor="border-l-purple-500"
          />
          <MetricCard
            title="Média por Cliente"
            value={stats.avgSessionsPerClient.toFixed(1)}
            icon={Users}
            borderColor="border-l-cyan-500"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, profissional ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="agendada">Agendadas</SelectItem>
                  <SelectItem value="realizada">Realizadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Sessões</CardTitle>
            <CardDescription>
              Mostrando {filteredSessions.length} de {sessions.length} sessões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma sessão encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.slice(0, 50).map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{formatDate(session.data)}</TableCell>
                        <TableCell>{session.horario}</TableCell>
                        <TableCell>{session.client_name || 'N/A'}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{session.user_name}</p>
                            <p className="text-xs text-muted-foreground">{session.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.valor ? `R$ ${session.valor.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedSession(session)
                                setActionDialog({ open: true, action: 'cancel' })
                              }}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar Sessão
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedSession(session)
                                setActionDialog({ open: true, action: 'reschedule' })
                              }}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reagendar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedSession(session)
                                  setActionDialog({ open: true, action: 'delete' })
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredSessions.length > 50 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando 50 de {filteredSessions.length} sessões. Use a busca para refinar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionDialog.action === 'delete' ? 'Excluir Sessão' : 
                 actionDialog.action === 'cancel' ? 'Cancelar Sessão' : 'Reagendar Sessão'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionDialog.action === 'delete' 
                  ? 'Esta ação não pode ser desfeita. A sessão será permanentemente removida.'
                  : actionDialog.action === 'cancel'
                  ? 'A sessão será marcada como cancelada.'
                  : 'A sessão será marcada para reagendamento.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction(actionDialog.action)}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}

export default AdminSessions
