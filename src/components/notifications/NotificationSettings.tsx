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
import { Bell, Users, Clock, Mail, MessageSquare, AlertCircle, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  daily_reminder: boolean
  daily_reminder_time: string
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
    daily_reminder: true,
    daily_reminder_time: '07:00',
    patient_reminder_24h: true,
    patient_reminder_1h: false,
    patient_confirmation: true
  })
  const [loading, setLoading] = useState(false)
  const [hasPhone, setHasPhone] = useState(true)
  const [activeTab, setActiveTab] = useState<'professional' | 'patients'>('professional')

  useEffect(() => {
    if (open && user) {
      loadSettings()
      if (type === 'whatsapp') {
        checkPhoneNumber()
      }
    }
  }, [open, user, type])

  const checkPhoneNumber = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('profiles')
      .select('telefone')
      .eq('user_id', user.id)
      .single()
    
    setHasPhone(!!data?.telefone && data.telefone.length > 0)
  }

  useEffect(() => {
    setConfig(prev => ({ ...prev, enabled: initialEnabled }))
  }, [initialEnabled])

  const loadSettings = async () => {
    try {
      // Buscar o registro mais recente (ordenar por updated_at DESC)
      const { data, error } = await supabase
        .from('notification_settings')
        .select('id, type, enabled, frequency, time, events, user_id, created_at, updated_at')
        .eq('user_id', user?.id)
        .eq('type', type)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar configurações:', error)
        setInitialConfig(config)
        return
      }

      if (data) {
        const events = data.events as string[] || []
        // O campo time vem como "HH:MM:SS", precisamos converter para "HH:MM"
        let timeValue = data.time || '07:00'
        if (timeValue && timeValue.length > 5) {
          timeValue = timeValue.substring(0, 5)
        }
        
        const loadedConfig = {
          enabled: data.enabled || false,
          new_booking: events.includes('new_booking'),
          booking_cancelled: events.includes('booking_cancelled'),
          daily_reminder: events.includes('daily_reminder'),
          daily_reminder_time: timeValue,
          patient_reminder_24h: events.includes('patient_reminder_24h'),
          patient_reminder_1h: events.includes('patient_reminder_1h'),
          patient_confirmation: events.includes('patient_confirmation')
        }
        setConfig(loadedConfig)
        setInitialConfig(loadedConfig)
      } else {
        // Se não há dados, definir o config inicial
        setInitialConfig(config)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setInitialConfig(config)
    }
  }

  const saveSettings = async (showToast = true) => {
    if (!user) return

    setLoading(true)
    try {
      // Construir array de eventos ativos
      const events: string[] = []
      if (config.new_booking) events.push('new_booking')
      if (config.booking_cancelled) events.push('booking_cancelled')
      if (config.daily_reminder) events.push('daily_reminder')
      if (config.patient_reminder_24h) events.push('patient_reminder_24h')
      if (config.patient_reminder_1h) events.push('patient_reminder_1h')
      if (config.patient_confirmation) events.push('patient_confirmation')

      // Buscar TODOS os registros existentes para este user/type (para limpar duplicatas)
      const { data: existingRecords } = await supabase
        .from('notification_settings')
        .select('id, updated_at')
        .eq('user_id', user.id)
        .eq('type', type)
        .order('updated_at', { ascending: false })

      let error
      
      if (existingRecords && existingRecords.length > 0) {
        // Atualizar o registro mais recente
        const mostRecentId = existingRecords[0].id
        
        const result = await supabase
          .from('notification_settings')
          .update({
            enabled: config.enabled,
            events,
            time: config.daily_reminder_time,
            updated_at: new Date().toISOString()
          })
          .eq('id', mostRecentId)
        error = result.error
        
        // Deletar registros duplicados (todos exceto o mais recente)
        if (!error && existingRecords.length > 1) {
          const duplicateIds = existingRecords.slice(1).map(r => r.id)
          console.log('[NotificationSettings] Removing duplicate records:', duplicateIds.length)
          await supabase
            .from('notification_settings')
            .delete()
            .in('id', duplicateIds)
        }
      } else {
        // Inserir novo registro
        const result = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            type,
            enabled: config.enabled,
            events,
            time: config.daily_reminder_time
          })
        error = result.error
      }

      if (error) throw error

      // Atualizar o config inicial para refletir o estado salvo
      setInitialConfig(config)
      setHasChanges(false)

      // Notificar o componente pai sobre a mudança no enabled
      if (onEnabledChange) {
        onEnabledChange(config.enabled)
      }

      if (showToast) {
        toast({
          title: "Configurações salvas",
          description: "As configurações de notificação foram atualizadas.",
        })
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      if (showToast) {
        toast({
          title: "Erro",
          description: "Não foi possível salvar as configurações.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-save quando qualquer configuração mudar
  const [hasChanges, setHasChanges] = useState(false)
  const [initialConfig, setInitialConfig] = useState<NotificationConfig | null>(null)
  
  useEffect(() => {
    if (initialConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(initialConfig)
      setHasChanges(changed)
    }
  }, [config, initialConfig])

  const handleToggle = (key: keyof NotificationConfig, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  // Salvar automaticamente ao fechar o modal se houver mudanças
  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && hasChanges) {
      await saveSettings(true)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          {/* Aviso para WhatsApp sem telefone cadastrado */}
          {type === 'whatsapp' && !hasPhone && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>Telefone não cadastrado!</strong> Para receber notificações por WhatsApp, 
                é necessário preencher o campo <span className="font-medium">"Telefone (WhatsApp)"</span> na 
                aba <span className="font-medium">"Perfil e Dados Pessoais"</span> das configurações.
              </AlertDescription>
            </Alert>
          )}

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
              
              {/* Lembrete diário com seleção de horário */}
              <div className={`p-3 rounded-lg border ${!config.enabled ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily_reminder_email" className="text-sm font-medium cursor-pointer">
                      Lembrete diário
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receber e-mail com todas as sessões do dia
                    </p>
                  </div>
                  <Switch
                    id="daily_reminder_email"
                    checked={config.daily_reminder}
                    onCheckedChange={(checked) => handleToggle('daily_reminder', checked)}
                    disabled={!config.enabled}
                  />
                </div>
                
                {config.daily_reminder && config.enabled && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="daily_time" className="text-sm text-muted-foreground">
                        Horário de envio:
                      </Label>
                      <Select
                        value={config.daily_reminder_time}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, daily_reminder_time: value }))}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0')
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {hour}:00
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {hasChanges ? 'Alterações serão salvas ao fechar' : 'Nenhuma alteração pendente'}
            </p>
            <Button 
              onClick={() => handleOpenChange(false)} 
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Fechar'}
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
