import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { formatCurrencyBR } from "@/utils/formatters"
import { formatTimeForDatabase } from "@/lib/utils"
import { Package, Repeat } from "lucide-react"

interface SessionEditModalProps {
  session: any
  clients: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionUpdated: () => void
}

export const SessionEditModal = ({ 
  session, 
  clients, 
  open, 
  onOpenChange, 
  onSessionUpdated 
}: SessionEditModalProps) => {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    client_id: '',
    data: '',
    horario: '',
    valor: '',
    anotacoes: ''
  })
  const [loading, setLoading] = useState(false)
  const [showReactivationMessage, setShowReactivationMessage] = useState(false)

  useEffect(() => {
    if (session) {
      setFormData({
        client_id: session.client_id || '',
        data: session.data || '',
        horario: session.horario ? session.horario.slice(0, 5) : '',
        valor: session.valor?.toString() || '',
        anotacoes: session.anotacoes || ''
      })
      setShowReactivationMessage(false)
    }
  }, [session])

  const handleClientChange = (value: string) => {
    setFormData(prev => ({ ...prev, client_id: value }))
    
    // Verificar se o cliente selecionado está inativo
    const selectedClient = clients.find(c => c.id === value)
    setShowReactivationMessage(selectedClient && !selectedClient.ativo)
  }

  const calculateStatus = (date: string, time: string) => {
    const sessionDateTime = new Date(`${date}T${time}:00`)
    const currentDateTime = new Date()
    
    // Se ainda não chegou a hora da sessão, é "agendada"
    // Se já passou da hora, é "realizada"
    return sessionDateTime <= currentDateTime ? 'realizada' : 'agendada'
  }

  const handleSave = async () => {
    if (!session) return

    // Calcular status automaticamente
    const autoStatus = calculateStatus(formData.data, formData.horario)

    setLoading(true)
    try {
      // Verificar se o cliente está inativo e reativá-lo se necessário
      const selectedClient = clients.find(c => c.id === formData.client_id)
      if (selectedClient && !selectedClient.ativo) {
        await supabase
          .from('clients')
          .update({ ativo: true })
          .eq('id', formData.client_id)
        
        toast({
          title: "Cliente reativado",
          description: "O cliente foi reativado automaticamente.",
        })
      }

      const { error } = await supabase
        .from('sessions')
        .update({
          client_id: formData.client_id,
          data: formData.data,
          horario: formatTimeForDatabase(formData.horario),
          valor: parseFloat(formData.valor) || null,
          status: autoStatus,
          anotacoes: formData.anotacoes || null
        })
        .eq('id', session.id)

      if (error) {
        throw error
      }

      toast({
        title: "Sessão atualizada",
        description: "A sessão foi atualizada com sucesso.",
      })

      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a sessão.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Sessão
            {session?.package_id && (
              <Badge variant="outline">
                <Package className="h-3.5 w-3.5" />
              </Badge>
            )}
            {session?.recurring_session_id && (
              <Badge variant="outline">
                <Repeat className="h-3.5 w-3.5" />
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="client">Cliente</Label>
            <Select
              value={formData.client_id}
              onValueChange={handleClientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <span>{client.nome}</span>
                      {!client.ativo && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-warning/10 text-warning">
                          inativo
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showReactivationMessage && (
              <div className="text-sm p-2 bg-warning/10 border border-warning/20 rounded-md text-warning">
                Ao salvar, este cliente será reativado automaticamente.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="Ex: 150.00"
                value={formData.valor}
                onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                Status será calculado automaticamente baseado na data/hora
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="anotacoes">Anotações</Label>
            <Textarea
              id="anotacoes"
              value={formData.anotacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, anotacoes: e.target.value }))}
              placeholder="Observações sobre a sessão..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}