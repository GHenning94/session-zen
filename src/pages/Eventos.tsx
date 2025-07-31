import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

console.log('🎯 Eventos.tsx carregado')
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, MapPin, Clock, Users, ExternalLink, Plus, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Event {
  id: string
  title: string
  description: string
  event_date: string
  start_time?: string
  end_time?: string
  location?: string
  category?: string
  registration_link?: string
  is_public: boolean
  user_id?: string
}

export default function Eventos() {
  console.log('🎯 Eventos: iniciando componente')
  const { user } = useAuth()
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  })
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    category: '',
    registration_link: '',
    is_public: true
  })

  const categories = [
    'psicologia',
    'psiquiatria',
    'psicanalise',
    'neuropsicologia',
    'terapia-ocupacional',
    'outros'
  ]

  const loadEvents = async () => {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [filters])

  const handleCreateEvent = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar eventos.",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .insert([{
          ...newEvent,
          user_id: user.id
        }])

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!",
      })

      setShowCreateModal(false)
      setNewEvent({
        title: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        location: '',
        category: '',
        registration_link: '',
        is_public: true
      })
      loadEvents()
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível criar o evento.",
        variant: "destructive"
      })
    }
  }

  const formatEventDate = (date: string, startTime?: string, endTime?: string) => {
    const eventDate = new Date(date)
    const dateStr = format(eventDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    
    if (startTime && endTime) {
      return `${dateStr} • ${startTime} às ${endTime}`
    } else if (startTime) {
      return `${dateStr} • ${startTime}`
    } else {
      return dateStr
    }
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'psicologia':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'psiquiatria':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'psicanalise':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'neuropsicologia':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'terapia-ocupacional':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Eventos</h1>
            <p className="text-muted-foreground">
              Descubra eventos, cursos e congressos da área da saúde mental
            </p>
          </div>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Nome do evento"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={newEvent.category}
                      onValueChange={(value) => setNewEvent({ ...newEvent, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Descreva o evento"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_date">Data *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Início</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Fim</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Local</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Local do evento"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registration_link">Link de Inscrição</Label>
                    <Input
                      id="registration_link"
                      type="url"
                      value={newEvent.registration_link}
                      onChange={(e) => setNewEvent({ ...newEvent, registration_link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.event_date}>
                  Criar Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Eventos */}
        {loading ? (
          <div className="text-center py-8">
            <p>Carregando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Não há eventos futuros que correspondam aos seus filtros.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Evento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => (
              <Card key={event.id} className="shadow-soft hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{event.title}</h3>
                        {event.category && (
                          <Badge variant="outline" className={getCategoryColor(event.category)}>
                            {event.category.charAt(0).toUpperCase() + event.category.slice(1).replace('-', ' ')}
                          </Badge>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-muted-foreground mb-4">{event.description}</p>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatEventDate(event.event_date, event.start_time, event.end_time)}</span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {event.registration_link && (
                      <Button asChild className="ml-4">
                        <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Inscrever-se
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}