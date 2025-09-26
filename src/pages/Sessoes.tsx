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
import { calculateSessionStatus } from "@/utils/sessionStatusUtils"
import { useNavigate } from 'react-router-dom'
import { TextPreview } from '@/components/TextPreview'

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
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null)
  
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
        .order('horario', { ascending: false })

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

      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome, ativo')
        .order('nome')

      if (clientsError) throw clientsError

      // Atualizar status automático das sessões
      const updatedSessions = (sessionsData || []).map(session => ({
        ...session,
        status: calculateSessionStatus(session.data, session.horario, session.status)
      }))

      setSessions(updatedSessions)
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
      await loadData()
    } catch (error) {
      console.error('Erro ao cancelar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a sessão.",
        variant: "destructive",
      })
    }
  }

  const handleMarkNoShow = async (sessionId: string) => {
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
      await loadData()
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
      await loadData()
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
    setEditingNote(null)
    setNoteModalOpen(true)
  }

  const handleEditNote = (note: SessionNote) => {
    setEditingNote(note)
    setSelectedSession(null)
    setNoteModalOpen(true)
  }

  const handleEditSession = (session: Session) => {
    setSelectedSession(session)
    setEditModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada': return 'default'
      case 'agendada': return 'secondary'
      case 'cancelada': return 'destructive'
      case 'falta': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizada': return 'Realizada'
      case 'agendada': return 'Agendada'
      case 'cancelada': return 'Cancelada'
      case 'falta': return 'Falta'
      default: return status
    }
  }

  // Filtrar e ordenar sessões (mais recente primeiro)
  const filteredSessions = sessions
    .filter(session => {
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
    .sort((a, b) => {
      const dateA = new Date(`${a.data} ${a.horario}`)
      const dateB = new Date(`${b.data} ${b.horario}`)
      return dateB.getTime() - dateA.getTime()
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
              <div className="text-2xl font-bold text-success">{stats.realizadas}</div>
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
               <div className="text-2xl font-bold text-success">
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
              
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="realizada">Realizadas</SelectItem>
                    <SelectItem value="agendada">Agendadas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                    <SelectItem value="falta">Faltas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="start-date">Data Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="end-date">Data Fim</Label>
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

        {/* Sessions List */}
        {activeTab === 'sessions' && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Histórico de Sessões</CardTitle>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Carregando sessões...</p>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma sessão encontrada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSessions.map((session) => (
                      <div key={session.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-card rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{session.clients?.nome || 'Cliente não encontrado'}</h3>
                                <Badge variant={getStatusColor(session.status)}>
                                  {getStatusLabel(session.status)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                 <div className="flex items-center gap-1">
                                   <Calendar className="w-3 h-3" />
                                   <span>{formatDateBR(session.data)}</span>
                                 </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeBR(session.horario)}</span>
                                </div>
                                {session.valor && (
                                  <div className="flex items-center gap-1">
                                    <span>{formatCurrencyBR(session.valor)}</span>
                                  </div>
                                )}
                              </div>
                              {session.anotacoes && (
                                <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                                  <strong>Anotações:</strong>
                                  <TextPreview 
                                    content={session.anotacoes}
                                    title={`Anotação - ${session.clients?.nome} - ${formatDateBR(session.data)}`}
                                    className="mt-1"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewSession(session.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver na Agenda
                              </DropdownMenuItem>
                              
                              {session.status !== 'cancelada' && session.status !== 'realizada' && (
                                <DropdownMenuItem onClick={() => handleEditSession(session)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Sessão
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem onClick={() => handleAddNote(session)}>
                                <StickyNote className="w-4 h-4 mr-2" />
                                Adicionar Anotação
                              </DropdownMenuItem>
                              
                              {session.status === 'realizada' && session.valor && (
                                <DropdownMenuItem onClick={() => handleViewPayment(session.id)}>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Ver Pagamento
                                </DropdownMenuItem>
                              )}
                              
                              {session.status === 'agendada' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleCancelSession(session.id)}
                                    className="text-red-600"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancelar Sessão
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleMarkNoShow(session.id)}
                                    className="text-yellow-600"
                                  >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Marcar como Falta
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              <DropdownMenuItem 
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir Sessão
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CardHeader>
          </Card>
        )}

        {/* Notes List */}
        {activeTab === 'notes' && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Anotações de Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma anotação encontrada.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <h3 className="font-medium">{note.clients?.nome || 'Cliente não encontrado'}</h3>
                             {note.sessions && (
                               <Badge variant="outline" className="text-xs">
                                 {formatDateBR(note.sessions.data)} às {formatTimeBR(note.sessions.horario)}
                               </Badge>
                             )}
                          </div>
                           <div className="text-sm text-muted-foreground mb-2">
                             <TextPreview 
                               content={note.notes}
                               isHtml={true}
                               title={`Anotação - ${note.clients?.nome} - ${note.sessions ? formatDateBR(note.sessions.data) : 'Data não disponível'}`}
                             />
                           </div>
                           <div className="text-xs text-muted-foreground">
                             Criado em {formatDateBR(note.created_at)} às {formatTimeBR(note.created_at)}
                           </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditNote(note)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar Anotação
                            </DropdownMenuItem>
                            {note.sessions && (
                              <DropdownMenuItem onClick={() => handleViewSession(note.session_id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Sessão
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <SessionNoteModal
          session={selectedSession}
          open={noteModalOpen}
          onOpenChange={setNoteModalOpen}
          onNoteCreated={loadData}
          editingNote={editingNote}
        />
        
        <SessionEditModal
          session={selectedSession}
          clients={clients}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSessionUpdated={loadData}
        />
      </div>
    </Layout>
  )
}