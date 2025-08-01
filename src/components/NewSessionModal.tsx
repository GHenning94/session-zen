import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"

interface NewSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date | null
  onSessionCreated?: () => void
}

export const NewSessionModal = ({ open, onOpenChange, selectedDate, onSessionCreated }: NewSessionModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { canAddSession, planLimits } = useSubscription()
  
  const [clients, setClients] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newSession, setNewSession] = useState({
    client_id: "",
    data: "",
    horario: "",
    valor: "",
    anotacoes: ""
  })

  // Carregar clientes e sessões
  const loadData = async () => {
    if (!user) return
    
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
      
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)

      setClients(clientsData || [])
      setSessions(sessionsData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
      // Se há uma data selecionada, usar ela
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0]
        setNewSession(prev => ({ ...prev, data: dateStr }))
      }
    }
  }, [open, user, selectedDate])

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
      
      onOpenChange(false)
      onSessionCreated?.()
      
      toast({
        title: "Sessão criada!",
        description: "A sessão foi agendada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  )
}