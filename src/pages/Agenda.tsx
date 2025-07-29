import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout } from "@/components/Layout"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  User
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

const Agenda = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { canAddSession, planLimits } = useSubscription()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Formulário para nova sessão
  const [newSession, setNewSession] = useState({
    client_id: "",
    data: "",
    horario: "",
    valor: "",
    anotacoes: ""
  })

  // Carregar dados do Supabase
  const loadData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Carregar sessões
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: true })
      
      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)

      if (sessionsError) {
        console.error('Erro ao carregar sessões:', sessionsError)
        toast({
          title: "Erro",
          description: "Não foi possível carregar as sessões.",
          variant: "destructive"
        })
      } else {
        setSessions(sessionsData || [])
      }

      if (clientsError) {
        console.error('Erro ao carregar clientes:', clientsError)
      } else {
        setClients(clientsData || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Recarregar dados quando há mudanças ou quando a data muda
  useEffect(() => {
    const handleStorageChange = () => {
      if (user) {
        loadData()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [selectedDate, user])

  const handleSaveSession = async () => {
    if (!newSession.client_id || !newSession.data || !newSession.horario) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, data e horário.",
        variant: "destructive"
      })
      return
    }

    // Validação de limite de sessões por cliente
    const clientSessions = sessions.filter(s => s.client_id === newSession.client_id).length
    if (!canAddSession(clientSessions)) {
      toast({
        title: "Limite Atingido",
        description: `Limite de ${planLimits.maxSessionsPerClient === Infinity ? '∞' : planLimits.maxSessionsPerClient} sessões por cliente atingido.`,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const sessionData = {
        user_id: user?.id,
        client_id: newSession.client_id,
        data: newSession.data,
        horario: newSession.horario,
        valor: newSession.valor ? parseFloat(newSession.valor) : null,
        anotacoes: newSession.anotacoes,
        status: 'agendada'
      }

      const { error } = await supabase
        .from('sessions')
        .insert([sessionData])
      
      if (error) throw error
      
      setNewSession({
        client_id: "",
        data: "",
        horario: "",
        valor: "",
        anotacoes: ""
      })
      
      setIsNewSessionOpen(false)
      await loadData()
      
      toast({
        title: "Sessão salva com sucesso!",
        description: "A sessão foi agendada e adicionada ao seu calendário.",
      })
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a sessão.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
      
      if (error) throw error
      
      toast({
        title: "Sessão cancelada",
        description: "A sessão foi removida da sua agenda.",
      })
      
      await loadData()
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a sessão.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
  ]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getSessionForTime = (time: string) => {
    const dateStr = selectedDate.toISOString().split('T')[0]
    return sessions.find(session => session.horario === time && session.data === dateStr)
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente não encontrado'
  }

  const addDays = (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  const todaySessionsCount = sessions.filter(session => {
    const sessionDate = new Date(session.data)
    const today = new Date()
    return sessionDate.toDateString() === selectedDate.toDateString()
  }).length

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie seus agendamentos e sessões
            </p>
          </div>
          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Agendar Nova Sessão</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo agendamento
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={newSession.client_id} onValueChange={(value) => setNewSession({...newSession, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data</Label>
                    <Input 
                      type="date" 
                      id="date" 
                      value={newSession.data}
                      onChange={(e) => setNewSession({...newSession, data: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Horário</Label>
                    <Select value={newSession.horario} onValueChange={(value) => setNewSession({...newSession, horario: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Valor (opcional)</Label>
                  <Input 
                    type="number" 
                    id="value" 
                    placeholder="200.00"
                    value={newSession.valor}
                    onChange={(e) => setNewSession({...newSession, valor: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Notas sobre a sessão..." 
                    className="resize-none"
                    value={newSession.anotacoes}
                    onChange={(e) => setNewSession({...newSession, anotacoes: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-gradient-primary hover:opacity-90" 
                  onClick={handleSaveSession}
                  disabled={isLoading}
                >
                  {isLoading ? "Salvando..." : "Salvar Sessão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Agenda Views */}
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-px mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-4 text-center text-sm font-medium text-muted-foreground bg-muted">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-border">
            {Array.from({ length: 35 }, (_, i) => {
              const date = addDays(selectedDate, i - selectedDate.getDay())
              const daySessionsData = sessions.filter(session => session.data === date.toISOString().split('T')[0])
              
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[120px] border border-border p-2 bg-background cursor-pointer hover:bg-accent/20",
                    date.getMonth() !== selectedDate.getMonth() && "text-muted-foreground bg-muted/50"
                  )}
                  onClick={() => {
                    setNewSession({...newSession, data: date.toISOString().split('T')[0]})
                    setIsNewSessionOpen(true)
                  }}
                >
                  <div className="font-medium text-sm mb-2">
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {daySessionsData.map((session) => (
                      <div 
                        key={session.id}
                        className="text-xs p-2 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors group relative"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{session.horario}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {getClientName(session.client_id)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {session.status}
                        </Badge>
                        
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSession(session.id)
                            }}
                            className="p-1 bg-white rounded shadow hover:bg-gray-50 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumo do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sessões Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{todaySessionsCount}</div>
              <p className="text-sm text-muted-foreground">Total de atendimentos</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Receita Prevista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {sessions
                  .filter(s => s.data === selectedDate.toISOString().split('T')[0])
                  .reduce((sum, s) => sum + (s.valor || 0), 0)
                  .toFixed(2)
                }
              </div>
              <p className="text-sm text-muted-foreground">Valor total do dia</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Taxa de Ocupação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {timeSlots.length > 0 ? ((todaySessionsCount / timeSlots.length) * 100).toFixed(0) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">{todaySessionsCount} de {timeSlots.length} horários</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default Agenda