import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Clock, User, Calendar, FileText, Filter, Eye, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { formatCurrencyBR, formatTimeBR, formatDateBR } from '@/utils/formatters'

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
  
  // Estados principais
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sessions' | 'notes'>('sessions')
  
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
          clients (nome)
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

      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome')
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'default'
      case 'agendada':
        return 'secondary'
      case 'cancelada':
        return 'destructive'
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
      default:
        return status
    }
  }

  const filteredSessions = sessions.filter(session => {
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

  const filteredNotes = sessionNotes.filter(note => {
    const matchesClient = !filters.client || filters.client === "all" || note.client_id === filters.client
    const matchesSearch = !filters.search || 
      note.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      note.notes.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchesClient && matchesSearch
  })

  // Estatísticas
  const stats = {
    total: sessions.length,
    realizadas: sessions.filter(s => s.status === 'realizada').length,
    agendadas: sessions.filter(s => s.status === 'agendada').length,
    canceladas: sessions.filter(s => s.status === 'cancelada').length,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Sessões</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.realizadas}</div>
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
              <div className="text-2xl font-bold text-green-600">
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
          <div className="space-y-4">
            {filteredSessions.map((session) => (
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
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrencyBR(session.valor)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
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
        
        {/* Empty States */}
        {activeTab === 'sessions' && filteredSessions.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma sessão encontrada</h3>
              <p className="text-muted-foreground">
                {sessions.length === 0 
                  ? 'Suas sessões aparecerão aqui conforme forem criadas na agenda.' 
                  : 'Tente ajustar os filtros para encontrar sessões.'
                }
              </p>
            </CardContent>
          </Card>
        )}
        
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