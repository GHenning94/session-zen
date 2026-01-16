import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { formatTimeForDatabase, cn } from "@/lib/utils"
import { CalendarIcon, Package, Repeat, User, Info, Lock, CreditCard, CalendarDays } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { encryptSensitiveData } from "@/utils/encryptionMiddleware"
import { UpgradeModal } from "@/components/UpgradeModal"
import { useRecurringSessions } from "@/hooks/useRecurringSessions"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: any | null
  selectedDate?: Date | null
  selectedClientId?: string | null
  prefilledTime?: string
  onSuccess?: () => void
}

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

const PAYMENT_METHODS = [
  { value: 'A definir', label: 'A definir' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Cartão', label: 'Cartão' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferência', label: 'Transferência' }
];

export const SessionModal = ({ 
  open, 
  onOpenChange, 
  session,
  selectedDate, 
  selectedClientId,
  prefilledTime,
  onSuccess 
}: SessionModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { canAddSession, planLimits, hasAccessToFeature } = useSubscription()
  const { createRecurring } = useRecurringSessions()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showReactivationMessage, setShowReactivationMessage] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Tipo de sessão
  const [sessionType, setSessionType] = useState<'individual' | 'pacote' | 'recorrente'>('individual')
  
  const hasPackagesAccess = hasAccessToFeature('packages')
  
  // Dados básicos da sessão (Bloco 1)
  const [formData, setFormData] = useState({
    client_id: "",
    data: "",
    horario: "",
    anotacoes: "",
    // Campos de pagamento (individual e recorrente por sessão)
    valor: "",
    metodo_pagamento: "",
    // Para pacote
    package_id: "",
    // Para edição
    status: "agendada",
    recurring_session_id: ""
  })

  // Dados de recorrência (Bloco 3 - Recorrente)
  const [recurringData, setRecurringData] = useState({
    recurrence_type: 'semanal' as 'diaria' | 'semanal' | 'quinzenal' | 'mensal',
    recurrence_interval: 1,
    dia_da_semana: 1,
    end_type: 'never' as 'never' | 'date' | 'count',
    recurrence_end_date: undefined as Date | undefined,
    recurrence_count: undefined as number | undefined,
    // Tipo de cobrança da recorrência (Bloco 4)
    billing_type: 'per_session' as 'per_session' | 'monthly_plan',
    // Campos para plano mensal
    monthly_value: 0,
    billing_day: 1,
    start_date: new Date(),
    auto_renewal: true
  })

  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome, ativo')
        .eq('user_id', user!.id)
        .order('nome')
      if (error) throw error
      return data || []
    },
    enabled: !!user && open,
    staleTime: 0,
    refetchOnMount: 'always'
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['packages', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return []
      const { data, error } = await supabase
        .from('packages')
        .select('id, nome, total_sessoes, sessoes_consumidas, status, valor_total')
        .eq('client_id', formData.client_id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!formData.client_id && open && sessionType === 'pacote'
  })

  const { data: clientSessions = [] } = useQuery({
    queryKey: ['client-sessions', formData.client_id, user?.id],
    queryFn: async () => {
      if (!formData.client_id || !user) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('client_id', formData.client_id)
        .eq('user_id', user.id)
      if (error) throw error
      return data || []
    },
    enabled: !!formData.client_id && !!user && open,
    staleTime: 0,
    refetchOnMount: 'always'
  })

  // Cálculos
  const remainingSessions = planLimits.maxSessionsPerClient === Infinity 
    ? null 
    : Math.max(0, planLimits.maxSessionsPerClient - clientSessions.length)
  
  const isClientLimitReached = !session && sessionType === 'individual' && remainingSessions !== null && remainingSessions <= 0
  const isEditingRecurringSession = session && session.recurring_session_id
  const selectedPackage = packages.find((p: any) => p.id === formData.package_id)

  // Inicializar formulário
  useEffect(() => {
    if (open) {
      if (session) {
        setFormData({
          client_id: session.client_id || "",
          data: session.data || "",
          horario: session.horario ? session.horario.slice(0, 5) : "",
          anotacoes: session.anotacoes || "",
          valor: session.valor?.toString() || "",
          metodo_pagamento: session.metodo_pagamento || "",
          package_id: session.package_id || "",
          status: session.status || "agendada",
          recurring_session_id: session.recurring_session_id || ""
        })
        if (session.package_id) {
          setSessionType('pacote')
        } else if (session.recurring_session_id) {
          setSessionType('recorrente')
        } else {
          setSessionType('individual')
        }
      } else {
        const initialData = selectedDate ? selectedDate.toISOString().split('T')[0] : ""
        setFormData({
          client_id: selectedClientId || "",
          data: initialData,
          horario: prefilledTime || "",
          anotacoes: "",
          valor: "",
          metodo_pagamento: "",
          package_id: "",
          status: "agendada",
          recurring_session_id: ""
        })
        setSessionType('individual')
        setRecurringData({
          recurrence_type: 'semanal',
          recurrence_interval: 1,
          dia_da_semana: new Date().getDay(),
          end_type: 'never',
          recurrence_end_date: undefined,
          recurrence_count: undefined,
          billing_type: 'per_session',
          monthly_value: 0,
          billing_day: 1,
          start_date: new Date(),
          auto_renewal: true
        })
      }
      setShowReactivationMessage(false)
    }
  }, [open, session, selectedDate, selectedClientId, prefilledTime])

  useEffect(() => {
    if (clients.length > 0 && formData.client_id) {
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
      setShowReactivationMessage(selectedClient && !selectedClient.ativo)
    }
  }, [clients, formData.client_id])

  // Handlers
  const handleSave = async () => {
    if (!user) return

    if (!formData.client_id || !formData.data || !formData.horario) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha cliente, data e horário.",
      })
      return
    }

    // Validações específicas por tipo
    if (sessionType === 'individual' && !session && !formData.valor) {
      toast({
        variant: "destructive",
        title: "Valor obrigatório",
        description: "Preencha o valor da sessão.",
      })
      return
    }

    if (sessionType === 'pacote' && !formData.package_id) {
      toast({
        variant: "destructive",
        title: "Pacote obrigatório",
        description: "Selecione um pacote.",
      })
      return
    }

    if (sessionType === 'recorrente' && !session) {
      return handleSaveRecurring()
    }

    if (!session && !canAddSession) {
      toast({
        variant: "destructive",
        title: "Limite atingido",
        description: "Você atingiu o limite de sessões do seu plano.",
      })
      return
    }

    if (isClientLimitReached) {
      setShowUpgradeModal(true)
      return
    }

    setIsLoading(true)
    
    try {
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
      if (selectedClient && !selectedClient.ativo) {
        await supabase.from('clients').update({ ativo: true }).eq('id', formData.client_id)
        toast({ title: "Cliente reativado", description: "O cliente foi reativado automaticamente." })
      }

      const sessionData = {
        user_id: user.id,
        client_id: formData.client_id,
        data: formData.data,
        horario: formatTimeForDatabase(formData.horario),
        valor: sessionType === 'pacote' ? null : (formData.valor ? parseFloat(formData.valor) : null),
        metodo_pagamento: sessionType === 'pacote' ? null : (formData.metodo_pagamento || null),
        status: formData.status,
        anotacoes: formData.anotacoes || null,
        session_type: sessionType,
        package_id: sessionType === 'pacote' ? formData.package_id : null,
        recurring_session_id: null
      }

      const encryptedSessionData = await encryptSensitiveData('sessions', sessionData) as typeof sessionData;

      if (session) {
        if (isEditingRecurringSession) {
          await supabase.from('sessions').update({
            status: formData.status,
            anotacoes: encryptedSessionData.anotacoes
          }).eq('id', session.id)
        } else {
          const { error } = await supabase.from('sessions').update(encryptedSessionData).eq('id', session.id)
          if (error) throw error

          if (encryptedSessionData.valor) {
            await supabase.from('payments').update({ 
              valor: encryptedSessionData.valor,
              data_vencimento: encryptedSessionData.data,
              metodo_pagamento: encryptedSessionData.metodo_pagamento || 'A definir'
            }).eq('session_id', session.id)
          }
        }
        toast({ title: "Sessão atualizada", description: "A sessão foi atualizada com sucesso." })
      } else {
        const { error } = await supabase.from('sessions').insert([encryptedSessionData]).select('id').single()
        if (error) throw error
        toast({ title: "Sessão criada", description: "A nova sessão foi agendada com sucesso." })
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar sessão:', error)
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRecurring = async () => {
    if (!user || !formData.client_id || !formData.horario) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha cliente e horário.",
      })
      return
    }

    if (recurringData.billing_type === 'per_session' && !formData.valor) {
      toast({
        variant: "destructive",
        title: "Valor obrigatório",
        description: "Preencha o valor por sessão.",
      })
      return
    }

    if (recurringData.billing_type === 'monthly_plan' && !recurringData.monthly_value) {
      toast({
        variant: "destructive",
        title: "Valor obrigatório",
        description: "Preencha o valor mensal.",
      })
      return
    }

    setIsLoading(true)
    
    try {
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
      if (selectedClient && !selectedClient.ativo) {
        await supabase.from('clients').update({ ativo: true }).eq('id', formData.client_id)
        toast({ title: "Cliente reativado", description: "O cliente foi reativado automaticamente." })
      }

      const data: any = {
        client_id: formData.client_id,
        recurrence_type: recurringData.recurrence_type,
        recurrence_interval: recurringData.recurrence_interval,
        dia_da_semana: recurringData.dia_da_semana,
        horario: formData.horario,
        valor: recurringData.billing_type === 'per_session' ? parseFloat(formData.valor) : 0,
        metodo_pagamento: formData.metodo_pagamento || 'A definir',
        recurrence_end_date: recurringData.end_type === 'date' && recurringData.recurrence_end_date
          ? recurringData.recurrence_end_date.toISOString().split('T')[0]
          : undefined,
        recurrence_count: recurringData.end_type === 'count' ? recurringData.recurrence_count : undefined,
        google_calendar_sync: false,
        billing_type: recurringData.billing_type
      };

      if (recurringData.billing_type === 'monthly_plan') {
        data.monthly_plan_data = {
          valor_mensal: recurringData.monthly_value,
          dia_cobranca: recurringData.billing_day,
          data_inicio: recurringData.start_date.toISOString().split('T')[0],
          renovacao_automatica: recurringData.auto_renewal
        };
      }

      await createRecurring(data);
      toast({ title: "Sessão recorrente criada", description: "A recorrência foi configurada com sucesso." })
      window.dispatchEvent(new Event('recurringSessionUpdated'));
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session || !confirm('Tem certeza que deseja excluir esta sessão?')) return
    setIsLoading(true)
    try {
      await supabase.from('payments').delete().eq('session_id', session.id)
      const { error } = await supabase.from('sessions').delete().eq('id', session.id)
      if (error) throw error
      toast({ title: "Sessão excluída", description: "A sessão foi excluída com sucesso." })
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const getModalTitle = () => {
    if (!session) return 'Nova Sessão'
    if (session.recurring_session_id) return 'Editar Sessão Recorrente'
    if (session.package_id) return 'Editar Sessão de Pacote'
    return 'Editar Sessão'
  }

  // Para edição de sessão recorrente - modal simplificado
  if (isEditingRecurringSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Editar Sessão Recorrente
            </DialogTitle>
          </DialogHeader>
          
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Para alterar dados da recorrência, acesse <strong>Sessões Recorrentes</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="faltou">Falta</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.anotacoes}
                onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>Excluir</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </DialogContent>
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} feature="Sessões por Paciente" />
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 1 — Dados básicos (sempre visível)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v, package_id: '' })}
                  disabled={!!session}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {!c.ativo && '(Inativo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showReactivationMessage && (
                  <p className="text-sm text-yellow-600 mt-1">⚠️ Cliente inativo será reativado automaticamente.</p>
                )}
              </div>

              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  disabled={isClientLimitReached}
                />
              </div>

              <div>
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  disabled={isClientLimitReached}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre a sessão..."
                  value={formData.anotacoes}
                  onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                  rows={2}
                  disabled={isClientLimitReached}
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 2 — Tipo de sessão (apenas criação)
          ══════════════════════════════════════════════════════════════════ */}
          {!session && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de sessão</Label>
                <RadioGroup
                  value={sessionType}
                  onValueChange={(v: any) => {
                    if (v === 'pacote' && !hasPackagesAccess) {
                      setShowUpgradeModal(true)
                      return
                    }
                    setSessionType(v)
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <Label htmlFor="t-individual" className="cursor-pointer flex-1 min-w-[120px]">
                    <Card className={cn(
                      "transition-all",
                      sessionType === 'individual' && "border-primary ring-1 ring-primary"
                    )}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <RadioGroupItem value="individual" id="t-individual" />
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Individual</span>
                      </CardContent>
                    </Card>
                  </Label>

                  <Label htmlFor="t-recorrente" className="cursor-pointer flex-1 min-w-[120px]">
                    <Card className={cn(
                      "transition-all",
                      sessionType === 'recorrente' && "border-primary ring-1 ring-primary"
                    )}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <RadioGroupItem value="recorrente" id="t-recorrente" />
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Recorrente</span>
                      </CardContent>
                    </Card>
                  </Label>

                  <Label htmlFor="t-pacote" className="cursor-pointer flex-1 min-w-[120px] relative">
                    <Card className={cn(
                      "transition-all",
                      sessionType === 'pacote' && "border-primary ring-1 ring-primary"
                    )}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <RadioGroupItem value="pacote" id="t-pacote" />
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pacote</span>
                        {!hasPackagesAccess && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                            <Lock className="w-2.5 h-2.5" />
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Label>
                </RadioGroup>

                {/* Limite de sessões */}
                {remainingSessions !== null && sessionType === 'individual' && formData.client_id && (
                  <div className={cn(
                    "text-sm p-2 rounded-md border",
                    remainingSessions === 0 
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : remainingSessions <= 3
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {remainingSessions === 0 
                      ? `Limite de ${planLimits.maxSessionsPerClient} sessões atingido.`
                      : `${remainingSessions} sessão(ões) restante(s) (limite: ${planLimits.maxSessionsPerClient})`
                    }
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              CAMPOS CONDICIONAIS — SESSÃO INDIVIDUAL
          ══════════════════════════════════════════════════════════════════ */}
          {sessionType === 'individual' && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    disabled={isClientLimitReached}
                  />
                </div>
                <div>
                  <Label>Método de pagamento</Label>
                  <Select
                    value={formData.metodo_pagamento}
                    onValueChange={(v) => setFormData({ ...formData, metodo_pagamento: v })}
                    disabled={isClientLimitReached}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status apenas em edição */}
                {session && (
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="faltou">Falta</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              CAMPOS CONDICIONAIS — SESSÃO DE PACOTE
          ══════════════════════════════════════════════════════════════════ */}
          {sessionType === 'pacote' && !session && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label>Selecionar pacote *</Label>
                  <Select
                    value={formData.package_id}
                    onValueChange={(v) => setFormData({ ...formData, package_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um pacote" /></SelectTrigger>
                    <SelectContent>
                      {packages.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} ({p.sessoes_consumidas}/{p.total_sessoes})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {packages.length === 0 && formData.client_id && (
                    <p className="text-sm text-muted-foreground mt-1">Nenhum pacote ativo para este cliente.</p>
                  )}
                </div>

                {/* Informações do pacote selecionado */}
                {selectedPackage && (
                  <div className="p-3 bg-muted/50 rounded-lg border text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pacote:</span>
                      <span className="font-medium">{selectedPackage.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessões:</span>
                      <span>{selectedPackage.sessoes_consumidas} de {selectedPackage.total_sessoes} utilizadas</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                      Sessões de pacote não geram pagamento individual.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              CAMPOS CONDICIONAIS — SESSÃO RECORRENTE
          ══════════════════════════════════════════════════════════════════ */}
          {sessionType === 'recorrente' && !session && (
            <>
              {/* BLOCO 3 — Regra de recorrência */}
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Regra de recorrência</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Frequência</Label>
                    <Select
                      value={recurringData.recurrence_type}
                      onValueChange={(v: any) => setRecurringData({ ...recurringData, recurrence_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diária</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Repetir a cada</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        className="w-16"
                        value={recurringData.recurrence_interval}
                        onChange={(e) => setRecurringData({ ...recurringData, recurrence_interval: parseInt(e.target.value) || 1 })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {recurringData.recurrence_type === 'diaria' && 'dia(s)'}
                        {recurringData.recurrence_type === 'semanal' && 'sem.'}
                        {recurringData.recurrence_type === 'quinzenal' && 'quinz.'}
                        {recurringData.recurrence_type === 'mensal' && 'mês'}
                      </span>
                    </div>
                  </div>

                  {recurringData.recurrence_type === 'semanal' && (
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Dia da semana</Label>
                      <Select
                        value={recurringData.dia_da_semana?.toString()}
                        onValueChange={(v) => setRecurringData({ ...recurringData, dia_da_semana: parseInt(v) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((d) => (
                            <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Término</Label>
                    <RadioGroup
                      value={recurringData.end_type}
                      onValueChange={(v: any) => setRecurringData({ ...recurringData, end_type: v })}
                      className="flex flex-wrap gap-3 mt-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="never" id="end-never" />
                        <Label htmlFor="end-never" className="text-sm font-normal cursor-pointer">Nunca</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="date" id="end-date" />
                        <Label htmlFor="end-date" className="text-sm font-normal cursor-pointer">Em data</Label>
                        {recurringData.end_type === 'date' && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 px-2">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {recurringData.recurrence_end_date 
                                  ? format(recurringData.recurrence_end_date, "dd/MM/yy", { locale: ptBR })
                                  : "Sel."
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={recurringData.recurrence_end_date}
                                onSelect={(d) => d && setRecurringData({ ...recurringData, recurrence_end_date: d })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="count" id="end-count" />
                        <Label htmlFor="end-count" className="text-sm font-normal cursor-pointer">Após</Label>
                        {recurringData.end_type === 'count' && (
                          <Input
                            type="number"
                            min="1"
                            className="w-14 h-7"
                            value={recurringData.recurrence_count || ''}
                            onChange={(e) => setRecurringData({ ...recurringData, recurrence_count: parseInt(e.target.value) || undefined })}
                            placeholder="nº"
                          />
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Feedback visual — Primeira sessão */}
                {formData.data && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      Primeira sessão será criada em:
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {format(new Date(formData.data + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {/* BLOCO 4 — Forma de cobrança */}
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Forma de cobrança</Label>
                <RadioGroup
                  value={recurringData.billing_type}
                  onValueChange={(v: any) => setRecurringData({ ...recurringData, billing_type: v })}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label htmlFor="b-session" className="cursor-pointer">
                    <Card className={cn(
                      "transition-all h-full",
                      recurringData.billing_type === 'per_session' && "border-primary ring-1 ring-primary"
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="per_session" id="b-session" />
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Por sessão</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">Cada sessão gera um pagamento</p>
                      </CardContent>
                    </Card>
                  </Label>

                  <Label htmlFor="b-monthly" className="cursor-pointer">
                    <Card className={cn(
                      "transition-all h-full",
                      recurringData.billing_type === 'monthly_plan' && "border-primary ring-1 ring-primary"
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="monthly_plan" id="b-monthly" />
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Plano mensal</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">Valor fixo por mês</p>
                      </CardContent>
                    </Card>
                  </Label>
                </RadioGroup>

                {/* Campos de cobrança por sessão */}
                {recurringData.billing_type === 'per_session' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label>Valor por sessão (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Método de pagamento</Label>
                      <Select
                        value={formData.metodo_pagamento}
                        onValueChange={(v) => setFormData({ ...formData, metodo_pagamento: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Campos de plano mensal */}
                {recurringData.billing_type === 'monthly_plan' && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Valor mensal (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={recurringData.monthly_value || ''}
                          onChange={(e) => setRecurringData({ ...recurringData, monthly_value: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Dia de cobrança</Label>
                        <Select
                          value={recurringData.billing_day.toString()}
                          onValueChange={(v) => setRecurringData({ ...recurringData, billing_day: parseInt(v) })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                              <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Início do plano</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(recurringData.start_date, "dd/MM/yyyy", { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={recurringData.start_date}
                              onSelect={(d) => d && setRecurringData({ ...recurringData, start_date: d })}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Método de pagamento</Label>
                        <Select
                          value={formData.metodo_pagamento}
                          onValueChange={(v) => setFormData({ ...formData, metodo_pagamento: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="auto-renew"
                        checked={recurringData.auto_renewal}
                        onCheckedChange={(c) => setRecurringData({ ...recurringData, auto_renewal: c })}
                      />
                      <Label htmlFor="auto-renew" className="text-sm font-normal cursor-pointer">Renovação automática</Label>
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      O valor mensal é cobrado independentemente da quantidade de sessões realizadas no mês.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              AÇÕES
          ══════════════════════════════════════════════════════════════════ */}
          <Separator />
          <div className="flex justify-between">
            <div>
              {session && (
                <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading || isClientLimitReached || !formData.client_id || !formData.data || !formData.horario}
              >
                {isLoading ? 'Salvando...' : session ? 'Atualizar' : 'Criar Sessão'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        feature={isClientLimitReached ? "Sessões por Paciente" : "Pacotes de Sessões"}
      />
    </Dialog>
  )
}
