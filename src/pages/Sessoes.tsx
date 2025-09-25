import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Clock, User, Calendar, FileText, Filter, StickyNote, MoreHorizontal, Edit, X, Eye, CreditCard, AlertTriangle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { formatCurrencyBR, formatTimeBR, formatDateBR } from '@/utils/formatters'
import { SessionNoteModal } from '@/components/SessionNoteModal'
import { SessionEditModal } from '@/components/SessionEditModal'
import { useNavigate } from 'react-router-dom'

interface Session {
  id: string
  data: string
  horario: string
  status: string
  valor?: number
  anotacoes?: string
  client_id: string
  clients?: {
    nome: string
  }
}

interface SessionNote {
  id: string
  client_id: string
  session_id: string
  notes: string
  created_at: string
  clients?: {
    nome: string
  }
  sessions?: {
    data: string
    horario: string
    status: string
  }
}

export default function Sessoes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  // Estados principais
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sessions' | 'notes'>('sessions')
  
  // Estados para modais
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    startDate: '',
    endDate: '',
    search: ''
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar sessões
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          clients (nome, ativo)
        `)
        .order('data', { ascending: false })

      if (sessionsError) throw sessionsError

      // Carregar anotações de sessões
      const { data: notesData, error: notesError } = await supabase
        .from('session_notes')
        .select(`
          *,
          clients (nome),
          sessions (data, horario, status)
        `)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      // Carregar clientes (incluindo inativos para edição)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome, ativo')
        .order('nome')

      if (clientsError) throw clientsError

      setSessions(sessionsData || [])
      setSessionNotes(notesData || [])
      setClients(clientsData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Configurar listeners em tempo real
  useEffect(() => {
    if (!user) return

    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${user.id}` },
        () => loadData()
      )
      .subscribe()

    const notesChannel = supabase
      .channel('notes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'session_notes', filter: `user_id=eq.${user.id}` },
        () => loadData()
      )
      .subscribe()

    const clientsChannel = supabase
      .channel('clients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${user.id}` },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(notesChannel)
      supabase.removeChannel(clientsChannel)
    }
  }, [user])

  const handleCancelSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelada' })
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: "Sessão cancelada",
        description: "A sessão foi cancelada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao cancelar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a sessão.",
        variant: "destructive",
      })
    }
  }
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'falta' })
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: "Sessão marcada como falta",
        description: "A sessão foi marcada como falta com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao marcar falta:', error)
      toast({
        title: "Erro",
        description: "Não foi possível marcar a falta.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: "Sessão excluída",
        description: "A sessão foi excluída permanentemente.",
      })
    } catch (error) {
      console.error('Erro ao excluir sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a sessão.",
        variant: "destructive",
      })
    }
  }

  const handleViewSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      navigate(`/agenda?highlight=${sessionId}&date=${session.data}`)
    } else {
      navigate('/agenda')
    }
  }

  const handleViewPayment = (sessionId: string) => {
    navigate(`/pagamentos?highlight=${sessionId}`)
  }

  const handleAddNote = (session: Session) => {
    setSelectedSession(session)
    setNoteModalOpen(true)
  }

  const handleEditSession = (session: Session) => {
    setSelectedSession(session)
    setEditModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'default'
      case 'agendada':
        return 'secondary'
      case 'cancelada':
        return 'destructive'
      case 'falta':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'Realizada'
      case 'agendada':
        return 'Agendada'
      case 'cancelada':
        return 'Cancelada'
      case 'falta':
        return 'Falta'
      default:
        return status
    }
  }

  // Separar sessões ativas e canceladas
  const activeSessions = sessions.filter(session => session.status !== 'cancelada' && session.status !== 'falta')
  const cancelledSessions = sessions.filter(session => session.status === 'cancelada')
  const noShowSessions = sessions.filter(session => session.status === 'falta')

  const filteredActiveSessions = activeSessions.filter(session => {
    const matchesStatus = !filters.status || filters.status === "all" || session.status === filters.status
    const matchesClient = !filters.client || filters.client === "all" || session.client_id === filters.client
    const matchesSearch = !filters.search || 
      session.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      session.anotacoes?.toLowerCase().includes(filters.search.toLowerCase())
    
    let matchesDate = true
    if (filters.startDate) {
      matchesDate = matchesDate && session.data >= filters.startDate
    }
    if (filters.endDate) {
      matchesDate = matchesDate && session.data <= filters.endDate
    }
    
    return matchesStatus && matchesClient && matchesSearch && matchesDate
  })

  const filteredCancelledSessions = cancelledSessions.filter(session => {
    const matchesClient = !filters.client || filters.client === "all" || session.client_id === filters.client
    const matchesSearch = !filters.search || 
      session.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      session.anotacoes?.toLowerCase().includes(filters.search.toLowerCase())
    
    let matchesDate = true
    if (filters.startDate) {
      matchesDate = matchesDate && session.data >= filters.startDate
    }
    if (filters.endDate) {
      matchesDate = matchesDate && session.data <= filters.endDate
    }
    
    return matchesClient && matchesSearch && matchesDate
  })

  const filteredNoShowSessions = noShowSessions.filter(session => {
    const matchesClient = !filters.client || filters.client === "all" || session.client_id === filters.client
    const matchesSearch = !filters.search || 
      session.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      session.anotacoes?.toLowerCase().includes(filters.search.toLowerCase())
    
    let matchesDate = true
    if (filters.startDate) {
      matchesDate = matchesDate && session.data >= filters.startDate
    }
    if (filters.endDate) {
      matchesDate = matchesDate && session.data <= filters.endDate
    }
    
    return matchesClient && matchesSearch && matchesDate
  })

  const filteredNotes = sessionNotes.filter(note => {
    const clientMatches = !filters.client || filters.client === "all" || note.client_id === filters.client
    const searchMatches = !filters.search || 
      note.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      note.notes.toLowerCase().includes(filters.search.toLowerCase())
    
    return clientMatches && searchMatches
  })

  // Estatísticas
  const stats = {
    total: sessions.length,
    realizadas: sessions.filter(s => s.status === 'realizada').length,
    agendadas: sessions.filter(s => s.status === 'agendada').length,
    canceladas: sessions.filter(s => s.status === 'cancelada').length,
    faltas: sessions.filter(s => s.status === 'falta').length,
    totalFaturado: sessions
      .filter(s => s.status === 'realizada' && s.valor)
      .reduce((sum, s) => sum + (s.valor || 0), 0)
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Histórico de Sessões</h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'sessions' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sessions')}
            >
              Sessões
            </Button>
            <Button
              variant={activeTab === 'notes' ? 'default' : 'outline'}
              onClick={() => setActiveTab('notes')}
            >
              Anotações
            </Button>
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Sessões</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold" style={{ color: 'hsl(142 71% 45%)' }}>{stats.realizadas}</div>
              <p className="text-xs text-muted-foreground">Realizadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.agendadas}</div>
              <p className="text-xs text-muted-foreground">Agendadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.canceladas}</div>
              <p className="text-xs text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.faltas}</div>
              <p className="text-xs text-muted-foreground">Faltas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
               <div className="text-2xl font-bold" style={{ color: 'hsl(142 71% 45%)' }}>
                {formatCurrencyBR(stats.totalFaturado)}
              </div>
              <p className="text-xs text-muted-foreground">Total Faturado</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Buscar por cliente ou anotações..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="client-filter">Cliente</Label>
                <Select value={filters.client} onValueChange={(value) => setFilters(prev => ({ ...prev, client: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {activeTab === 'sessions' && (
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="falta">Falta</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Sessões Ativas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sessões Ativas</h3>
              {filteredActiveSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{session.clients?.nome}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDateBR(session.data)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTimeBR(session.horario)}</span>
                        </div>
                        
                        <Badge variant={getStatusColor(session.status)}>
                          {getStatusLabel(session.status)}
                        </Badge>
                        
                        {session.valor && (
                          <span className="text-sm font-medium" style={{ color: 'hsl(142 71% 45%)' }}>
                            {formatCurrencyBR(session.valor)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddNote(session)}
                        >
                          <StickyNote className="h-4 w-4 mr-2" />
                          Adicionar Anotação
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSession(session)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewSession(session.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver sessão
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewPayment(session.id)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Ver Pagamento
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <X className="h-4 w-4 mr-2" />
                                    <span className="text-destructive">Cancelar</span>
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancelar Sessão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja cancelar esta sessão? Esta ação pode ser desfeita editando a sessão posteriormente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelSession(session.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Cancelar Sessão
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    <span className="text-yellow-600">Falta</span>
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Marcar como Falta</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja marcar esta sessão como falta? Esta ação pode ser desfeita editando a sessão posteriormente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleMarkNoShow(session.id)}
                                      className="bg-yellow-600 text-white hover:bg-yellow-700"
                                    >
                                      Marcar Falta
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    <span className="text-destructive">Excluir</span>
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Sessão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir permanentemente esta sessão? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSession(session.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir Permanentemente
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {session.anotacoes && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Anotações</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{session.anotacoes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {filteredActiveSessions.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma sessão ativa encontrada</h3>
                    <p className="text-muted-foreground">
                      {activeSessions.length === 0 
                        ? 'Suas sessões aparecerão aqui conforme forem criadas na agenda.' 
                        : 'Tente ajustar os filtros para encontrar sessões.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sessões Canceladas */}
            {filteredCancelledSessions.length > 0 && (
              <div className="space-y-4">
                <div className="py-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-background px-4 text-muted-foreground">Sessões Canceladas</span>
                    </div>
                  </div>
                </div>
                {filteredCancelledSessions.map((session) => (
                  <Card key={session.id} className="opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">{session.clients?.nome}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDateBR(session.data)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{formatTimeBR(session.horario)}</span>
                          </div>
                          
                          <Badge variant="destructive">
                            Cancelada
                          </Badge>
                          
                          {session.valor && (
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatCurrencyBR(session.valor)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSession(session)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewSession(session.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver sessão
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewPayment(session.id)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Ver Pagamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {session.anotacoes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Anotações</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{session.anotacoes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Sessões com Falta */}
            {filteredNoShowSessions.length > 0 && (
              <div className="space-y-4">
                <div className="py-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-background px-4 text-muted-foreground">Sessões com Falta</span>
                    </div>
                  </div>
                </div>
                {filteredNoShowSessions.map((session) => (
                  <Card key={session.id} className="opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">{session.clients?.nome}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDateBR(session.data)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{formatTimeBR(session.horario)}</span>
                          </div>
                          
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
                            Falta
                          </Badge>
                          
                          {session.valor && (
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatCurrencyBR(session.valor)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSession(session)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewSession(session.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver sessão
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewPayment(session.id)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Ver Pagamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {session.anotacoes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Anotações</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{session.anotacoes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{note.clients?.nome}</span>
                      </div>
                      
                      {note.sessions && (
                        <>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDateBR(note.sessions.data)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatTimeBR(note.sessions.horario)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Anotação da Sessão</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.notes}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Modals */}
        <SessionNoteModal
          session={selectedSession}
          open={noteModalOpen}
          onOpenChange={setNoteModalOpen}
          onNoteCreated={loadData}
        />
        
        <SessionEditModal
          session={selectedSession}
          clients={clients}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSessionUpdated={loadData}
        />
        
        {activeTab === 'notes' && filteredNotes.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma anotação encontrada</h3>
              <p className="text-muted-foreground">
                {sessionNotes.length === 0 
                  ? 'As anotações das suas sessões aparecerão aqui.' 
                  : 'Tente ajustar os filtros para encontrar anotações.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}