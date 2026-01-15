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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Users, Clock, Mail, MessageSquare } from "lucide-react"

interface NotificationSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'email' | 'whatsapp'
  title: string
  initialEnabled?: boolean
  onEnabledChange?: (enabled: boolean) => void
}

interface NotificationConfig {
  enabled: boolean
  // Para o profissional
  new_booking: boolean
  booking_cancelled: boolean
  payment_received: boolean
  session_reminder_24h: boolean
  session_reminder_1h: boolean
  // Para os pacientes (apenas WhatsApp)
  patient_reminder_24h: boolean
  patient_reminder_1h: boolean
  patient_confirmation: boolean
}

export const NotificationSettings = ({ 
  open, 
  onOpenChange, 
  type, 
  title,
  initialEnabled = false,
  onEnabledChange
}: NotificationSettingsProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [config, setConfig] = useState<NotificationConfig>({
    enabled: initialEnabled,
    new_booking: true,
    booking_cancelled: true,
    payment_received: true,
    session_reminder_24h: true,
    session_reminder_1h: false,
    patient_reminder_24h: true,
    patient_reminder_1h: false,
    patient_confirmation: true
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'professional' | 'patients'>('professional')

  useEffect(() => {
    if (open && user) {
      loadSettings()
    }
  }, [open, user, type])

  useEffect(() => {
    setConfig(prev => ({ ...prev, enabled: initialEnabled }))
  }, [initialEnabled])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('id, type, enabled, frequency, time, events, user_id, created_at, updated_at')
        .eq('user_id', user?.id)
        .eq('type', type)
        .single()

      if (data && data.events) {
        const events = data.events as string[]
        setConfig({
          enabled: data.enabled || false,
          new_booking: events.includes('new_booking'),
          booking_cancelled: events.includes('booking_cancelled'),
          payment_received: events.includes('payment_received'),
          session_reminder_24h: events.includes('session_reminder_24h'),
          session_reminder_1h: events.includes('session_reminder_1h'),
          patient_reminder_24h: events.includes('patient_reminder_24h'),
          patient_reminder_1h: events.includes('patient_reminder_1h'),
          patient_confirmation: events.includes('patient_confirmation')
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
      // Construir array de eventos ativos
      const events: string[] = []
      if (config.new_booking) events.push('new_booking')
      if (config.booking_cancelled) events.push('booking_cancelled')
      if (config.payment_received) events.push('payment_received')
      if (config.session_reminder_24h) events.push('session_reminder_24h')
      if (config.session_reminder_1h) events.push('session_reminder_1h')
      if (config.patient_reminder_24h) events.push('patient_reminder_24h')
      if (config.patient_reminder_1h) events.push('patient_reminder_1h')
      if (config.patient_confirmation) events.push('patient_confirmation')

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          type,
          enabled: config.enabled,
          events
        })

      if (error) throw error

      // Notificar o componente pai sobre a mudança no enabled
      if (onEnabledChange) {
        onEnabledChange(config.enabled)
      }

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

  const handleToggle = (key: keyof NotificationConfig, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'email' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            Configurar {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Switch principal */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="font-medium">
                {type === 'email' ? 'Notificações por E-mail' : 'Notificações por WhatsApp'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {type === 'email' 
                  ? 'Ativar/desativar todas as notificações por e-mail'
                  : 'Ativar/desativar todas as notificações por WhatsApp'
                }
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => handleToggle('enabled', checked)}
            />
          </div>

          {type === 'whatsapp' ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'professional' | 'patients')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="professional" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Para você
                </TabsTrigger>
                <TabsTrigger value="patients" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Para pacientes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="professional" className="mt-4 space-y-3">
                <NotificationOption
                  id="new_booking_whatsapp"
                  label="Novos agendamentos"
                  description="Receber aviso quando um paciente agendar"
                  checked={config.new_booking}
                  onChange={(checked) => handleToggle('new_booking', checked)}
                  disabled={!config.enabled}
                />
                <NotificationOption
                  id="booking_cancelled_whatsapp"
                  label="Cancelamentos"
                  description="Receber aviso quando um agendamento for cancelado"
                  checked={config.booking_cancelled}
                  onChange={(checked) => handleToggle('booking_cancelled', checked)}
                  disabled={!config.enabled}
                />
                <NotificationOption
                  id="payment_received_whatsapp"
                  label="Pagamentos recebidos"
                  description="Receber aviso quando um pagamento for registrado"
                  checked={config.payment_received}
                  onChange={(checked) => handleToggle('payment_received', checked)}
                  disabled={!config.enabled}
                />
                <NotificationOption
                  id="session_reminder_24h_whatsapp"
                  label="Lembrete 24h antes"
                  description="Receber lembrete 24 horas antes das sessões"
                  checked={config.session_reminder_24h}
                  onChange={(checked) => handleToggle('session_reminder_24h', checked)}
                  disabled={!config.enabled}
                />
                <NotificationOption
                  id="session_reminder_1h_whatsapp"
                  label="Lembrete 1h antes"
                  description="Receber lembrete 1 hora antes das sessões"
                  checked={config.session_reminder_1h}
                  onChange={(checked) => handleToggle('session_reminder_1h', checked)}
                  disabled={!config.enabled}
                />
              </TabsContent>
              
              <TabsContent value="patients" className="mt-4 space-y-3">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Mensagens automáticas para pacientes
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure quais mensagens seus pacientes receberão automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <NotificationOption
                      id="patient_confirmation"
                      label="Confirmação de agendamento"
                      description="Enviar confirmação quando o paciente agendar"
                      checked={config.patient_confirmation}
                      onChange={(checked) => handleToggle('patient_confirmation', checked)}
                      disabled={!config.enabled}
                    />
                    <NotificationOption
                      id="patient_reminder_24h"
                      label="Lembrete 24h antes"
                      description="Enviar lembrete 24 horas antes da sessão"
                      checked={config.patient_reminder_24h}
                      onChange={(checked) => handleToggle('patient_reminder_24h', checked)}
                      disabled={!config.enabled}
                    />
                    <NotificationOption
                      id="patient_reminder_1h"
                      label="Lembrete 1h antes"
                      description="Enviar lembrete 1 hora antes da sessão"
                      checked={config.patient_reminder_1h}
                      onChange={(checked) => handleToggle('patient_reminder_1h', checked)}
                      disabled={!config.enabled}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Notificações que você receberá:</Label>
              <NotificationOption
                id="new_booking_email"
                label="Novos agendamentos"
                description="Receber e-mail quando um paciente agendar"
                checked={config.new_booking}
                onChange={(checked) => handleToggle('new_booking', checked)}
                disabled={!config.enabled}
              />
              <NotificationOption
                id="booking_cancelled_email"
                label="Cancelamentos"
                description="Receber e-mail quando um agendamento for cancelado"
                checked={config.booking_cancelled}
                onChange={(checked) => handleToggle('booking_cancelled', checked)}
                disabled={!config.enabled}
              />
              <NotificationOption
                id="payment_received_email"
                label="Pagamentos recebidos"
                description="Receber e-mail quando um pagamento for registrado"
                checked={config.payment_received}
                onChange={(checked) => handleToggle('payment_received', checked)}
                disabled={!config.enabled}
              />
              <NotificationOption
                id="session_reminder_24h_email"
                label="Lembrete 24h antes"
                description="Receber lembrete 24 horas antes das sessões"
                checked={config.session_reminder_24h}
                onChange={(checked) => handleToggle('session_reminder_24h', checked)}
                disabled={!config.enabled}
              />
              <NotificationOption
                id="session_reminder_1h_email"
                label="Lembrete 1h antes"
                description="Receber lembrete 1 hora antes das sessões"
                checked={config.session_reminder_1h}
                onChange={(checked) => handleToggle('session_reminder_1h', checked)}
                disabled={!config.enabled}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
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

// Componente auxiliar para cada opção de notificação
interface NotificationOptionProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const NotificationOption = ({ id, label, description, checked, onChange, disabled }: NotificationOptionProps) => (
  <div className={`flex items-center justify-between p-3 rounded-lg border ${disabled ? 'opacity-50' : 'hover:bg-muted/50'}`}>
    <div className="space-y-0.5">
      <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
    </div>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  </div>
)
