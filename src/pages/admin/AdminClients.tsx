import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  Users,
  Loader2,
  RefreshCcw,
  Search,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Shield,
  ArrowRightLeft,
  History
} from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import { MetricCard } from "@/components/admin/MetricCard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface ClientStats {
  totalClients: number
  activeClients: number
  inactiveClients: number
  avgSessionsPerClient: number
}

interface Client {
  id: string
  nome: string
  email: string
  telefone: string
  ativo: boolean
  user_name: string
  user_email: string
  user_id: string
  sessions_count: number
  last_session: string | null
  created_at: string
}

const AdminClients = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<ClientStats>({
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    avgSessionsPerClient: 0
  })
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string }>({ open: false, action: '' })
  const [historyDialog, setHistoryDialog] = useState(false)
  const [clientHistory, setClientHistory] = useState<any[]>([])

  useEffect(() => {
    fetchClientsData()
  }, [])

  useEffect(() => {
    filterClients()
  }, [searchTerm, clients])

  const fetchClientsData = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await adminApiCall('admin-get-clients-stats')

      if (error) throw error

      setStats({
        totalClients: data.totalClients || 0,
        activeClients: data.activeClients || 0,
        inactiveClients: data.inactiveClients || 0,
        avgSessionsPerClient: data.avgSessionsPerClient || 0
      })
      setClients(data.clients || [])
      setFilteredClients(data.clients || [])
    } catch (error: any) {
      console.error('[AdminClients] Error:', error)
      toast.error('Erro ao carregar dados de clientes')
    } finally {
      setIsLoading(false)
    }
  }

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = clients.filter(c => 
      c.nome?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.user_name?.toLowerCase().includes(term) ||
      c.user_email?.toLowerCase().includes(term)
    )
    setFilteredClients(filtered)
  }

  const handleAction = async (action: string) => {
    if (!selectedClient) return
    
    try {
      const { error } = await adminApiCall('admin-manage-client', {
        clientId: selectedClient.id,
        action
      })

      if (error) throw error

      const actionMessages: Record<string, string> = {
        anonymize: 'Dados anonimizados',
        delete: 'Cliente excluído',
        deactivate: 'Cliente desativado'
      }
      
      toast.success(actionMessages[action] || 'Ação executada com sucesso')
      fetchClientsData()
    } catch (error: any) {
      toast.error('Erro ao executar ação')
    } finally {
      setActionDialog({ open: false, action: '' })
      setSelectedClient(null)
    }
  }

  const viewHistory = async (client: Client) => {
    setSelectedClient(client)
    try {
      const { data, error } = await adminApiCall('admin-get-client-history', {
        clientId: client.id
      })

      if (error) throw error

      setClientHistory(data.sessions || [])
      setHistoryDialog(true)
    } catch (error) {
      toast.error('Erro ao carregar histórico')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
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
              <Users className="h-8 w-8 text-cyan-500" />
              Clientes Finais (Pacientes)
            </h1>
            <p className="text-muted-foreground">
              Gestão de pacientes cadastrados na plataforma
            </p>
          </div>
          <Button onClick={fetchClientsData} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Clientes"
            value={stats.totalClients.toLocaleString('pt-BR')}
            icon={Users}
            borderColor="border-l-blue-500"
          />
          <MetricCard
            title="Clientes Ativos"
            value={stats.activeClients.toLocaleString('pt-BR')}
            icon={Users}
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="Clientes Inativos"
            value={stats.inactiveClients.toLocaleString('pt-BR')}
            icon={Users}
            borderColor="border-l-gray-500"
          />
          <MetricCard
            title="Média de Sessões"
            value={stats.avgSessionsPerClient.toFixed(1)}
            description="Por cliente"
            icon={Calendar}
            borderColor="border-l-purple-500"
          />
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou profissional responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              Mostrando {filteredClients.length} de {clients.length} clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Última Sessão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.slice(0, 50).map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.nome}</p>
                            <p className="text-xs text-muted-foreground">{client.email || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.user_name}</p>
                            <p className="text-xs text-muted-foreground">{client.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{client.sessions_count}</TableCell>
                        <TableCell>{formatDate(client.last_session)}</TableCell>
                        <TableCell>
                          <Badge variant={client.ativo ? "default" : "secondary"}>
                            {client.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewHistory(client)}>
                                <History className="h-4 w-4 mr-2" />
                                Ver Histórico
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setSelectedClient(client)
                                setActionDialog({ open: true, action: 'anonymize' })
                              }}>
                                <Shield className="h-4 w-4 mr-2" />
                                Anonimizar (LGPD)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedClient(client)
                                setActionDialog({ open: true, action: 'deactivate' })
                              }}>
                                <Users className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedClient(client)
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
            {filteredClients.length > 50 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando 50 de {filteredClients.length} clientes. Use a busca para refinar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionDialog.action === 'delete' ? 'Excluir Cliente' : 
                 actionDialog.action === 'anonymize' ? 'Anonimizar Dados (LGPD)' : 'Desativar Cliente'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionDialog.action === 'delete' 
                  ? 'Esta ação não pode ser desfeita. O cliente será permanentemente removido.'
                  : actionDialog.action === 'anonymize'
                  ? 'Os dados pessoais serão substituídos por dados anônimos. Esta ação é irreversível e atende aos requisitos da LGPD.'
                  : 'O cliente será marcado como inativo e não aparecerá nas listagens padrão.'}
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

        {/* History Dialog */}
        <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Histórico de Sessões - {selectedClient?.nome}</DialogTitle>
              <DialogDescription>
                Histórico completo de sessões do cliente
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {clientHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma sessão encontrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientHistory.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{formatDate(session.data)}</TableCell>
                        <TableCell>{session.horario}</TableCell>
                        <TableCell>
                          <Badge variant={session.status === 'realizada' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.valor ? `R$ ${session.valor.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export default AdminClients
