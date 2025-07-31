import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Clock, User, Calendar, FileText, Plus, Edit, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useSmartData } from '@/hooks/useSmartData'

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
  const { data: clients } = useSmartData({ type: 'clients' })
  const { data: sessions } = useSmartData({ type: 'sessions' })
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null)
  const [filters, setFilters] = useState({
    client: '',
    search: ''
  })

  const filteredClients = clients.filter((client: any) => 
    !filters.client || client.id === filters.client
  )

  const clientSessions = sessions.filter((session: any) => 
    session.client_id === selectedClient
  ).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const loadSessionNotes = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('session_notes')
        .select(`
          *,
          clients!inner(nome),
          sessions!inner(data, horario, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters.client) {
        query = query.eq('client_id', filters.client)
      }

      const { data, error } = await query

      if (error) throw error

      let filteredData = data || []
      
      if (filters.search) {
        filteredData = filteredData.filter((note: any) => 
          note.notes.toLowerCase().includes(filters.search.toLowerCase()) ||
          note.clients?.nome.toLowerCase().includes(filters.search.toLowerCase())
        )
      }

      setSessionNotes(filteredData)
    } catch (error) {
      console.error('Erro ao carregar anotações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as anotações.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessionNotes()
  }, [user, filters])

  const handleSaveNote = async () => {
    if (!user || !selectedClient || !selectedSession || !newNote.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    try {
      if (editingNote) {
        // Editar anotação existente
        const { error } = await supabase
          .from('session_notes')
          .update({ notes: newNote })
          .eq('id', editingNote.id)
          .eq('user_id', user.id)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Anotação atualizada com sucesso!",
        })
      } else {
        // Criar nova anotação
        const { error } = await supabase
          .from('session_notes')
          .insert([{
            user_id: user.id,
            client_id: selectedClient,
            session_id: selectedSession,
            notes: newNote
          }])

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Anotação criada com sucesso!",
        })
      }

      setShowNoteModal(false)
      setNewNote('')
      setSelectedClient('')
      setSelectedSession('')
      setEditingNote(null)
      loadSessionNotes()
    } catch (error) {
      console.error('Erro ao salvar anotação:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a anotação.",
        variant: "destructive"
      })
    }
  }

  const handleEditNote = (note: SessionNote) => {
    setEditingNote(note)
    setSelectedClient(note.client_id)
    setSelectedSession(note.session_id)
    setNewNote(note.notes)
    setShowNoteModal(true)
  }

  const handleNewNote = () => {
    setEditingNote(null)
    setSelectedClient('')
    setSelectedSession('')
    setNewNote('')
    setShowNoteModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'agendada':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatSessionDate = (date: string, time: string) => {
    const sessionDate = new Date(date)
    return `${format(sessionDate, "dd/MM/yyyy", { locale: ptBR })} às ${time}`
  }

  // Agrupar anotações por cliente
  const notesByClient = sessionNotes.reduce((acc: any, note) => {
    const clientName = note.clients?.nome || 'Cliente desconhecido'
    if (!acc[clientName]) {
      acc[clientName] = []
    }
    acc[clientName].push(note)
    return acc
  }, {})

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Histórico de Sessões</h1>
            <p className="text-muted-foreground">
              Gerencie anotações e histórico de sessões com seus clientes
            </p>
          </div>
          
          <Button onClick={handleNewNote}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Anotação
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Buscar nas anotações..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={filters.client}
                  onValueChange={(value) => setFilters({ ...filters, client: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os clientes</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anotações agrupadas por cliente */}
        {loading ? (
          <div className="text-center py-8">
            <p>Carregando anotações...</p>
          </div>
        ) : Object.keys(notesByClient).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma anotação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando anotações para suas sessões.
              </p>
              <Button onClick={handleNewNote}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Anotação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(notesByClient).map(([clientName, notes]: [string, any]) => (
              <Card key={clientName} className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {clientName}
                  </CardTitle>
                  <CardDescription>
                    {notes.length} anotação{notes.length !== 1 ? 'ões' : ''} de sessão
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notes.map((note: SessionNote) => (
                      <div key={note.id} className="border-l-4 border-primary/20 pl-4 py-3 bg-muted/30 rounded-r-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {note.sessions ? 
                                formatSessionDate(note.sessions.data, note.sessions.horario) : 
                                'Sessão não encontrada'
                              }
                            </span>
                            {note.sessions?.status && (
                              <Badge variant="outline" className={getStatusColor(note.sessions.status)}>
                                {note.sessions.status}
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          Anotação criada em {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Nova/Editar Anotação */}
        <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Editar Anotação' : 'Nova Anotação de Sessão'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select 
                  value={selectedClient} 
                  onValueChange={(value) => {
                    setSelectedClient(value)
                    setSelectedSession('') // Reset session when client changes
                  }}
                  disabled={!!editingNote}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClient && (
                <div className="space-y-2">
                  <Label>Sessão *</Label>
                  <Select 
                    value={selectedSession} 
                    onValueChange={setSelectedSession}
                    disabled={!!editingNote}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientSessions.map((session: any) => (
                        <SelectItem key={session.id} value={session.id}>
                          {formatSessionDate(session.data, session.horario)} - {session.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Anotações da Sessão *</Label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Descreva o que aconteceu na sessão, observações sobre o cliente, evolução, etc..."
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNoteModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveNote} 
                  disabled={!selectedClient || !selectedSession || !newNote.trim()}
                >
                  {editingNote ? 'Atualizar' : 'Salvar'} Anotação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}