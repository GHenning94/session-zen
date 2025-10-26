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
import { Clock, User, Calendar, FileText, Filter, StickyNote, MoreHorizontal, Edit, X, Eye, CreditCard, AlertTriangle, Trash2, Plus, Package } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { formatCurrencyBR, formatTimeBR, formatDateBR } from '@/utils/formatters'
import { SessionNoteModal } from '@/components/SessionNoteModal'
import { SessionModal } from '@/components/SessionModal'
import { SessionDetailsModal } from '@/components/SessionDetailsModal'
import { EvolucaoModal } from '@/components/EvolucaoModal'
import { formatClientName } from '@/lib/utils'
import { calculateSessionStatus, sessionNeedsAttention } from "@/utils/sessionStatusUtils"
import { useNavigate } from 'react-router-dom'
import { TextPreview } from '@/components/TextPreview'
import { ClientAvatar } from '@/components/ClientAvatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PulsingDot } from '@/components/ui/pulsing-dot'

interface Session {
  id: string
  data: string
  horario: string
  status: string
  valor?: number
  anotacoes?: string
  client_id: string
  package_id?: string
  clients?: {
    nome: string
    avatar_url?: string
  }
  avatar_signed_url?: string
}

interface SessionNote {
  id: string
  client_id: string
  session_id: string
  notes: string
  created_at: string
  clients?: {
    nome: string
    avatar_url?: string
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
  const [newSessionModalOpen, setNewSessionModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [evolucaoModalOpen, setEvolucaoModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null)
  const [selectedNoteForEvolucao, setSelectedNoteForEvolucao] = useState<SessionNote | null>(null)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  
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
      
      // Carregar sessões com avatares
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          clients (nome, ativo, avatar_url)
        `)
        .order('data', { ascending: false })
        .order('horario', { ascending: false })

      if (sessionsError) throw sessionsError

      // Carregar anotações de sessões
      const { data: notesData, error: notesError } = await supabase
        .from('session_notes')
        .select(`
          *,
          clients (nome, avatar_url),
          sessions (data, horario, status)
        `)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome, ativo, avatar_url')
        .order('nome')

      if (clientsError) throw clientsError

      // Não atualizar status automaticamente - manter como está
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
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('sessionUpdated'))
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
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('sessionUpdated'))
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
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('sessionUpdated'))
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
    try {
      const session = sessions.find(s => s.id === sessionId)
      if (session) {
        navigate(`/agenda?highlight=${sessionId}&date=${session.data}`)
      } else {
        navigate('/agenda')
      }
    } catch (error) {
      console.error('Error navigating to session:', error)
      toast({
        title: "Erro",
        description: "Não foi possível navegar para a sessão.",
        variant: "destructive",
      })
    }
  }

  const handleViewPayment = (sessionId: string) => {
    try {
      navigate(`/pagamentos?highlight=${sessionId}`)
    } catch (error) {
      console.error('Error navigating to payment:', error)
      toast({
        title: "Erro",
        description: "Não foi possível navegar para o pagamento.",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = (session: Session) => {
    try {
      setSelectedSession(session)
      setEditingNote(null)
      setNoteModalOpen(true)
    } catch (error) {
      console.error('Error opening note modal:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o modal de lembrete.",
        variant: "destructive",
      })
    }
  }

  const handleEditNote = (note: SessionNote) => {
    setEditingNote(note)
    setSelectedSession(null)
    setNoteModalOpen(true)
  }

  const handleEditSession = (session: Session) => {
    try {
      setSelectedSession(session)
      setEditModalOpen(true)
    } catch (error) {
      console.error('Error opening edit modal:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o modal de edição.",
        variant: "destructive",
      })
    }
  }

  const handleSessionClick = (session: Session) => {
    try {
      setSelectedSession(session)
      setDetailsModalOpen(true)
    } catch (error) {
      console.error('Error opening session details:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir os detalhes da sessão.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('session_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      toast({
        title: "Lembrete excluído",
        description: "O lembrete foi excluído com sucesso.",
      })
      await loadData()
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lembrete.",
        variant: "destructive",
      })
    }
  }

  const handleIncluirNoProntuario = (note: SessionNote) => {
    setSelectedNoteForEvolucao(note)
    setEvolucaoModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada': return 'success'
      case 'agendada': return 'info'
      case 'cancelada': return 'destructive'
      case 'falta': return 'warning'
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

  // Filtrar e ordenar sessões pela mais próxima (futuras primeiro, depois passadas)
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
      const now = new Date()
      const dateTimeA = new Date(`${a.data}T${a.horario}`)
      const dateTimeB = new Date(`${b.data}T${b.horario}`)
      
      const isAfutureA = dateTimeA > now
      const isFutureB = dateTimeB > now
      
      // Sessões futuras vêm primeiro
      if (isAfutureA && !isFutureB) return -1
      if (!isAfutureA && isFutureB) return 1
      
      // Se ambas são futuras ou ambas são passadas, ordenar pela mais próxima
      if (isAfutureA && isFutureB) {
        return dateTimeA.getTime() - dateTimeB.getTime() // Mais próxima primeiro
      } else {
        return dateTimeB.getTime() - dateTimeA.getTime() // Mais recente primeiro
      }
    })

  // Separar sessões em futuras e passadas
  const now = new Date()
  const futureSessions = filteredSessions.filter(session => {
    const sessionDateTime = new Date(`${session.data}T${session.horario}`)
    return sessionDateTime > now
  })
  const pastSessions = filteredSessions.filter(session => {
    const sessionDateTime = new Date(`${session.data}T${session.horario}`)
    return sessionDateTime < now
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
              onClick={() => setNewSessionModalOpen(true)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Sessão
            </Button>
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
              Lembretes
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
              <div className="text-2xl font-bold text-primary">{stats.agendadas}</div>
              <p className="text-xs text-muted-foreground">Agendadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">{stats.canceladas}</div>
              <p className="text-xs text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-warning">{stats.faltas}</div>
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
            </CardHeader>
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
                  <div className="space-y-8">
                    {/* Sessões Futuras */}
                    {futureSessions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Sessões Futuras
                          </h3>
                          <div className="h-px bg-border flex-1" />
                        </div>
                        <div className="space-y-4">
                          {futureSessions.map((session) => {
                            const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                            
                            return (
                            <div 
                              key={session.id} 
                              className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
                              onClick={() => handleSessionClick(session)}
                            >
                              {needsAttention && (
                                <div className="absolute top-4 left-4">
                                  <PulsingDot color="warning" size="md" />
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                  <ClientAvatar 
                                    avatarPath={session.clients?.avatar_url}
                                    clientName={session.clients?.nome || 'Cliente'}
                                    size="lg"
                                  />
                                   <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-lg font-semibold">{formatClientName(session.clients?.nome || 'Cliente não encontrado')}</h3>
                                      <Badge variant={getStatusColor(session.status)}>
                                        {getStatusLabel(session.status)}
                                      </Badge>
                                      {session.package_id && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Package className="h-3 w-3 mr-1" />
                                          Pacote
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4" />
                                          <span>{formatDateBR(session.data)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4" />
                                          <span>{formatTimeBR(session.horario)}</span>
                                        </div>
                                        {session.valor && (
                                          <span className="font-medium">{formatCurrencyBR(session.valor)}</span>
                                        )}
                                      </div>
                                    </div>
                                    {session.anotacoes && (
                                      <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                                        <strong>Observações Iniciais:</strong>
                                        <TextPreview 
                                          content={session.anotacoes}
                                          title={`Observações - ${session.clients?.nome} - ${formatDateBR(session.data)}`}
                                          className="mt-1"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sessões Passadas */}
                    {pastSessions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Sessões Passadas
                          </h3>
                          <div className="h-px bg-border flex-1" />
                        </div>
                        <div className="space-y-4">
                          {pastSessions.map((session) => {
                            const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                            
                            return (
                      <div 
                        key={session.id} 
                        className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
                        onClick={() => handleSessionClick(session)}
                      >
                        {needsAttention && (
                          <div className="absolute top-4 left-4">
                            <PulsingDot color="warning" size="md" />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <ClientAvatar 
                              avatarPath={session.clients?.avatar_url}
                              clientName={session.clients?.nome || 'Cliente'}
                              size="lg"
                            />
                             <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{formatClientName(session.clients?.nome || 'Cliente não encontrado')}</h3>
                                <Badge variant={getStatusColor(session.status)}>
                                  {getStatusLabel(session.status)}
                                </Badge>
                                {session.package_id && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Package className="h-3 w-3 mr-1" />
                                    Pacote
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDateBR(session.data)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatTimeBR(session.horario)}</span>
                                  </div>
                                  {session.valor && (
                                    <span className="font-medium">{formatCurrencyBR(session.valor)}</span>
                                  )}
                                </div>
                              </div>
                              {session.anotacoes && (
                                <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                                  <strong>Observações Iniciais:</strong>
                                  <TextPreview 
                                    content={session.anotacoes}
                                    title={`Observações - ${session.clients?.nome} - ${formatDateBR(session.data)}`}
                                    className="mt-1"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
          </Card>
        )}

        {/* Notes List */}
        {activeTab === 'notes' && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Lembretes de sessões</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lembrete encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                      <div key={note.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <ClientAvatar 
                              avatarPath={note.clients?.avatar_url}
                              clientName={note.clients?.nome || 'Cliente'}
                              size="lg"
                            />
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{formatClientName(note.clients?.nome || 'Cliente não encontrado')}</h3>
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
                                title={`Lembrete - ${note.clients?.nome} - ${note.sessions ? formatDateBR(note.sessions.data) : 'Data não disponível'}`}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">
                              Criado em {formatDateBR(note.created_at)} às {formatTimeBR(note.created_at)}
                            </div>
                            
                            {/* Botões de ação */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIncluirNoProntuario(note)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Incluir no prontuário
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Ícones de ação */}
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditNote(note)}
                            title="Editar lembrete"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteNoteId(note.id)}
                            title="Excluir lembrete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <SessionDetailsModal
          session={selectedSession}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onEdit={handleEditSession}
          onDelete={handleDeleteSession}
          onCancel={handleCancelSession}
          onMarkNoShow={handleMarkNoShow}
          onViewAgenda={handleViewSession}
          onViewPayment={handleViewPayment}
          onAddNote={handleAddNote}
        />

        <SessionNoteModal
          session={selectedSession}
          open={noteModalOpen}
          onOpenChange={setNoteModalOpen}
          onNoteCreated={loadData}
          editingNote={editingNote}
        />
        
        <SessionModal
          session={selectedSession}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={loadData}
        />

        <SessionModal
          open={newSessionModalOpen}
          onOpenChange={setNewSessionModalOpen}
          onSuccess={loadData}
        />

        <EvolucaoModal
          open={evolucaoModalOpen}
          onOpenChange={setEvolucaoModalOpen}
          clientId={selectedNoteForEvolucao?.client_id || ''}
          clientName={selectedNoteForEvolucao?.clients?.nome || ''}
          onEvolucaoCreated={() => {
            loadData()
            toast({
              title: "Lembrete incluído no prontuário",
              description: "O lembrete foi adicionado como evolução no prontuário.",
            })
          }}
          sessionData={selectedNoteForEvolucao && selectedNoteForEvolucao.sessions ? {
            id: selectedNoteForEvolucao.session_id,
            data: selectedNoteForEvolucao.sessions.data,
            horario: selectedNoteForEvolucao.sessions.horario
          } : undefined}
          initialContent={selectedNoteForEvolucao?.notes || ''}
        />

        {/* Diálogo de confirmação para excluir lembrete */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lembrete? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteNoteId) {
                    handleDeleteNote(deleteNoteId)
                    setDeleteNoteId(null)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}