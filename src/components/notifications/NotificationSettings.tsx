import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

interface NotificationSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'email' | 'whatsapp' | 'reminder' | 'reports'
  title: string
}

export const NotificationSettings = ({ open, onOpenChange, type, title }: NotificationSettingsProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [settings, setSettings] = useState({
    enabled: false,
    frequency: 'daily',
    time: '09:00',
    events: [] as string[]
  })
  const [loading, setLoading] = useState(false)

  const eventOptions = {
    email: [
      { id: 'new_booking', label: 'Novos agendamentos' },
      { id: 'booking_cancelled', label: 'Cancelamentos' },
      { id: 'payment_received', label: 'Pagamentos recebidos' },
      { id: 'session_reminder', label: 'Lembrete de sessão' }
    ],
    whatsapp: [
      { id: 'new_booking', label: 'Novos agendamentos' },
      { id: 'booking_cancelled', label: 'Cancelamentos' },
      { id: 'session_reminder', label: 'Lembrete de sessão' },
      { id: 'payment_due', label: 'Pagamento pendente' },
      { id: 'payment_received', label: 'Pagamentos recebidos' }
    ],
    reminder: [
      { id: '24h_before', label: '24 horas antes' },
      { id: '1h_before', label: '1 hora antes' },
      { id: '15min_before', label: '15 minutos antes' }
    ],
    reports: [
      { id: 'sessions_summary', label: 'Resumo de sessões' },
      { id: 'financial_summary', label: 'Resumo financeiro' },
      { id: 'clients_summary', label: 'Resumo de clientes' }
    ]
  }

  useEffect(() => {
    if (open && user) {
      loadSettings()
    }
  }, [open, user, type])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('id, type, enabled, frequency, time, events, user_id, created_at, updated_at')
        .eq('user_id', user?.id)
        .eq('type', type)
        .single()

      if (data) {
        setSettings({
          enabled: data.enabled || false,
          frequency: data.frequency || 'daily',
          time: data.time || '09:00',
          events: data.events || []
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          type,
          enabled: settings.enabled,
          frequency: settings.frequency,
          time: settings.time,
          events: settings.events
        })

      if (error) throw error

      toast({
        title: "Configurações salvas",
        description: "As configurações de notificação foram atualizadas.",
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEventToggle = (eventId: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      events: checked 
        ? [...prev.events, eventId]
        : prev.events.filter(id => id !== eventId)
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {(type === 'email' || type === 'reports') && (
            <div>
              <Label>Frequência</Label>
              <Select
                value={settings.frequency}
                onValueChange={(value) => setSettings(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediato</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  {type === 'reports' && <SelectItem value="monthly">Mensal</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          {settings.frequency !== 'immediate' && (
            <div>
              <Label>Horário de envio</Label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          <div>
            <Label>Eventos para notificar</Label>
            <div className="space-y-2 mt-2">
              {eventOptions[type]?.map((event) => (
                <div key={event.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.id}
                    checked={settings.events.includes(event.id)}
                    onCheckedChange={(checked) => handleEventToggle(event.id, !!checked)}
                  />
                  <Label htmlFor={event.id} className="text-sm">
                    {event.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}