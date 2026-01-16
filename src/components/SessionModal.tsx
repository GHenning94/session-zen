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
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { formatCurrencyBR } from "@/utils/formatters"
import { formatTimeForDatabase, cn } from "@/lib/utils"
import { CalendarIcon, Package, Repeat, User, DollarSign, Clock, FileText, Info, Lock, Crown, CreditCard, CalendarDays, ChevronDown, ChevronUp } from "lucide-react"
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
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
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
  
  // Session type: 'individual' | 'pacote' | 'recorrente'
  const [sessionType, setSessionType] = useState<'individual' | 'pacote' | 'recorrente'>('individual')
  
  // Check if user has access to packages feature
  const hasPackagesAccess = hasAccessToFeature('packages')
  
  // Main form data
  const [formData, setFormData] = useState({
    client_id: "",
    data: "",
    horario: "",
    valor: "",
    metodo_pagamento: "",
    status: "agendada",
    anotacoes: "",
    package_id: "",
    recurring_session_id: ""
  })

  // Recurring-specific form data
  const [recurringData, setRecurringData] = useState({
    recurrence_type: 'semanal' as 'diaria' | 'semanal' | 'quinzenal' | 'mensal',
    recurrence_interval: 1,
    dia_da_semana: 1,
    end_type: 'never' as 'never' | 'date' | 'count',
    recurrence_end_date: undefined as Date | undefined,
    recurrence_count: undefined as number | undefined,
    billing_type: 'per_session' as 'per_session' | 'monthly_plan',
    // Monthly plan fields
    monthly_value: 0,
    billing_day: 1,
    start_date: new Date(),
    auto_renewal: true
  })

  // Carregar clientes
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

  // Carregar pacotes ativos do cliente
  const { data: packages = [] } = useQuery({
    queryKey: ['packages', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return []
      
      const { data, error } = await supabase
        .from('packages')
        .select('id, nome, total_sessoes, sessoes_consumidas, status, client_id')
        .eq('client_id', formData.client_id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!formData.client_id && open && sessionType === 'pacote'
  })

  // Carregar sessões do cliente para calcular limite
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

  // Calcular sessões restantes para o cliente
  const remainingSessions = planLimits.maxSessionsPerClient === Infinity 
    ? null 
    : Math.max(0, planLimits.maxSessionsPerClient - clientSessions.length)
  
  // Verificar se o limite de sessões por cliente foi atingido (apenas para criação de sessões individuais)
  const isClientLimitReached = !session && sessionType === 'individual' && remainingSessions !== null && remainingSessions <= 0

  // Determinar se é uma sessão recorrente em modo edição
  const isEditingRecurringSession = session && session.recurring_session_id

  // Inicializar formulário
  useEffect(() => {
    if (open) {
      if (session) {
        // Modo edição
        setFormData({
          client_id: session.client_id || "",
          data: session.data || "",
          horario: session.horario ? session.horario.slice(0, 5) : "",
          valor: session.valor?.toString() || "",
          metodo_pagamento: session.metodo_pagamento || "",
          status: session.status || "agendada",
          anotacoes: session.anotacoes || "",
          package_id: session.package_id || "",
          recurring_session_id: session.recurring_session_id || ""
        })
        // Determinar tipo de sessão baseado nos IDs
        if (session.package_id) {
          setSessionType('pacote')
        } else if (session.recurring_session_id) {
          setSessionType('recorrente')
        } else {
          setSessionType('individual')
        }
      } else {
        // Modo criação
        const initialData = selectedDate ? selectedDate.toISOString().split('T')[0] : ""
        setFormData({
          client_id: selectedClientId || "",
          data: initialData,
          horario: prefilledTime || "",
          valor: "",
          metodo_pagamento: "",
          status: "agendada",
          anotacoes: "",
          package_id: "",
          recurring_session_id: ""
        })
        setSessionType('individual')
        // Reset recurring data
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

  // Verificar cliente inativo
  useEffect(() => {
    if (clients.length > 0 && formData.client_id) {
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
      setShowReactivationMessage(selectedClient && !selectedClient.ativo)
    }
  }, [clients, formData.client_id])

  const handleSave = async () => {
    if (!user) return

    // Validações básicas
    if (!formData.client_id) {
      toast({
        variant: "destructive",
        title: "Cliente obrigatório",
        description: "Selecione um cliente para a sessão.",
      })
      return
    }

    // Para sessões recorrentes, criar via hook de recorrência
    if (sessionType === 'recorrente' && !session) {
      return handleSaveRecurring()
    }

    // Validações para sessões não-recorrentes
    if (!formData.data || !formData.horario) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha data e horário.",
      })
      return
    }

    // Validar valor obrigatório na criação (apenas para sessões não-pacote)
    if (!session && sessionType !== 'pacote' && !formData.valor) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Preencha o valor da sessão.",
      })
      return
    }

    if (sessionType === 'pacote' && !formData.package_id) {
      toast({
        variant: "destructive",
        title: "Pacote obrigatório",
        description: "Selecione um pacote para esta sessão.",
      })
      return
    }

    // Verificar limite do plano
    if (!session && !canAddSession) {
      toast({
        variant: "destructive",
        title: "Limite atingido",
        description: "Você atingiu o limite de sessões do seu plano. Faça upgrade para adicionar mais.",
      })
      return
    }

    // Verificar limite de sessões por cliente
    if (isClientLimitReached) {
      setShowUpgradeModal(true)
      return
    }

    setIsLoading(true)
    
    try {
      // Reativar cliente se necessário
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
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

      const sessionData = {
        user_id: user.id,
        client_id: formData.client_id,
        data: formData.data,
        horario: formatTimeForDatabase(formData.horario),
        valor: formData.valor ? parseFloat(formData.valor) : null,
        metodo_pagamento: formData.metodo_pagamento || null,
        status: formData.status,
        anotacoes: formData.anotacoes || null,
        session_type: sessionType,
        package_id: sessionType === 'pacote' ? formData.package_id : null,
        recurring_session_id: sessionType === 'recorrente' ? formData.recurring_session_id : null
      }

      // Encrypt sensitive session data
      const encryptedSessionData = await encryptSensitiveData('sessions', sessionData) as typeof sessionData;

      if (session) {
        // Atualizar sessão existente
        if (isEditingRecurringSession) {
          const updateData = {
            status: formData.status,
            anotacoes: encryptedSessionData.anotacoes
          };
          const { error } = await supabase
            .from('sessions')
            .update(updateData)
            .eq('id', session.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('sessions')
            .update(encryptedSessionData)
            .eq('id', session.id)

          if (error) throw error

          // Atualizar pagamento associado se o valor mudou
          if (encryptedSessionData.valor) {
            const { error: paymentError } = await supabase
              .from('payments')
              .update({ 
                valor: encryptedSessionData.valor,
                data_vencimento: encryptedSessionData.data,
                metodo_pagamento: encryptedSessionData.metodo_pagamento || 'A definir'
              })
              .eq('session_id', session.id)
            
            if (paymentError) console.error('Erro ao atualizar pagamento:', paymentError)
          }
        }

        toast({
          title: "Sessão atualizada",
          description: "A sessão foi atualizada com sucesso.",
        })
      } else {
        // Criar nova sessão
        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert([encryptedSessionData])
          .select('id')
          .single()

        if (error) throw error

        toast({
          title: "Sessão criada",
          description: "A nova sessão foi agendada com sucesso.",
        })
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar sessão:', error)
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRecurring = async () => {
    if (!user || !formData.client_id) return

    if (!formData.horario) {
      toast({
        variant: "destructive",
        title: "Horário obrigatório",
        description: "Preencha o horário da sessão.",
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
        description: "Preencha o valor mensal do plano.",
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Reativar cliente se necessário
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
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

      // Adicionar dados do plano mensal se for esse tipo
      if (recurringData.billing_type === 'monthly_plan') {
        data.monthly_plan_data = {
          valor_mensal: recurringData.monthly_value,
          dia_cobranca: recurringData.billing_day,
          data_inicio: recurringData.start_date.toISOString().split('T')[0],
          renovacao_automatica: recurringData.auto_renewal
        };
      }

      await createRecurring(data);

      toast({
        title: "Sessão recorrente criada",
        description: "A nova sessão recorrente foi configurada com sucesso.",
      })

      window.dispatchEvent(new Event('recurringSessionUpdated'));

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar sessão recorrente:', error)
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session) return

    if (!confirm('Tem certeza que deseja excluir esta sessão?')) return

    setIsLoading(true)
    try {
      // Primeiro excluir o pagamento associado
      await supabase
        .from('payments')
        .delete()
        .eq('session_id', session.id)

      // Depois excluir a sessão
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', session.id)

      if (error) throw error

      toast({
        title: "Sessão excluída",
        description: "A sessão foi excluída com sucesso.",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSessionTypeIcon = () => {
    if (session?.package_id) return <Package className="h-4 w-4" />
    if (session?.recurring_session_id) return <Repeat className="h-4 w-4" />
    
    if (!session) {
      switch (sessionType) {
        case 'pacote': return <Package className="h-4 w-4" />
        case 'recorrente': return <Repeat className="h-4 w-4" />
        default: return null
      }
    }
    
    return null
  }

  const getModalTitle = () => {
    if (!session) return 'Nova Sessão'
    if (session.recurring_session_id) return 'Editar Sessão Recorrente'
    if (session.package_id) return 'Editar Sessão de Pacote'
    return 'Editar Sessão Individual'
  }

  // Check if we should show recurring options based on selection
  const showRecurringOptions = sessionType === 'recorrente' && !session

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSessionTypeIcon()}
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Se é edição de sessão recorrente, mostrar apenas status e observações */}
          {isEditingRecurringSession ? (
            <>
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Esta é uma sessão recorrente. Para editar cliente, data, horário, valor ou método de pagamento, acesse a página de <strong>Sessões Recorrentes</strong>.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="realizada">Realizada</SelectItem>
                      <SelectItem value="faltou">Falta</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden sm:block" />

                <div className="col-span-2">
                  <Label htmlFor="anotacoes">Anotações</Label>
                  <Textarea
                    id="anotacoes"
                    placeholder="Observações sobre a sessão..."
                    value={formData.anotacoes}
                    onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ===== STEP 1: Cliente ===== */}
              <div>
                <Label htmlFor="client_id">Cliente {!session && '*'}</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value, package_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome} {!client.ativo && '(Inativo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showReactivationMessage && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ Este cliente está inativo e será reativado automaticamente.
                  </p>
                )}
              </div>

              {/* ===== STEP 2: Tipo de Sessão (apenas na criação, aparece após cliente) ===== */}
              {!session && formData.client_id && (
                <div className="space-y-3">
                  <Label>Tipo de Sessão</Label>
                  <RadioGroup
                    value={sessionType}
                    onValueChange={(value: any) => {
                      if (value === 'pacote' && !hasPackagesAccess) {
                        setShowUpgradeModal(true)
                        return
                      }
                      setSessionType(value)
                    }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <Label htmlFor="type-individual" className="cursor-pointer">
                      <Card className={cn(
                        "transition-all h-full",
                        sessionType === 'individual' && "border-primary ring-2 ring-primary/20"
                      )}>
                        <CardContent className="p-3 text-center">
                          <RadioGroupItem value="individual" id="type-individual" className="sr-only" />
                          <User className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <span className="text-sm font-medium">Individual</span>
                        </CardContent>
                      </Card>
                    </Label>

                    <Label htmlFor="type-pacote" className="cursor-pointer">
                      <Card className={cn(
                        "transition-all h-full relative",
                        sessionType === 'pacote' && "border-primary ring-2 ring-primary/20"
                      )}>
                        <CardContent className="p-3 text-center">
                          <RadioGroupItem value="pacote" id="type-pacote" className="sr-only" />
                          <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <span className="text-sm font-medium">Pacote</span>
                          {!hasPackagesAccess && (
                            <Badge variant="secondary" className="absolute -top-1 -right-1 text-[9px] px-1 py-0">
                              <Lock className="w-2.5 h-2.5 mr-0.5" />
                              Pro
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </Label>

                    <Label htmlFor="type-recorrente" className="cursor-pointer">
                      <Card className={cn(
                        "transition-all h-full",
                        sessionType === 'recorrente' && "border-primary ring-2 ring-primary/20"
                      )}>
                        <CardContent className="p-3 text-center">
                          <RadioGroupItem value="recorrente" id="type-recorrente" className="sr-only" />
                          <Repeat className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <span className="text-sm font-medium">Recorrente</span>
                        </CardContent>
                      </Card>
                    </Label>
                  </RadioGroup>
                </div>
              )}

              {/* Limite de sessões por cliente */}
              {remainingSessions !== null && formData.client_id && !session && sessionType === 'individual' && (
                <div className={`text-sm p-2 rounded-md border ${
                  remainingSessions === 0 
                    ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                    : remainingSessions <= 3 
                      ? 'bg-warning/10 border-warning/20 text-warning'
                      : 'bg-muted border-border text-muted-foreground'
                }`}>
                  {remainingSessions === 0 
                    ? `Limite de ${planLimits.maxSessionsPerClient} sessões atingido para este paciente.`
                    : `${remainingSessions} sessão(ões) restante(s) para este paciente (limite: ${planLimits.maxSessionsPerClient})`
                  }
                </div>
              )}

              {/* ===== CAMPOS PARA SESSÃO INDIVIDUAL ===== */}
              {(sessionType === 'individual' || session) && !showRecurringOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={isClientLimitReached ? 'opacity-50' : ''}>
                    <Label htmlFor="data">Data {!session && '*'}</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      disabled={isClientLimitReached}
                    />
                  </div>

                  <div className={isClientLimitReached ? 'opacity-50' : ''}>
                    <Label htmlFor="horario">Horário {!session && '*'}</Label>
                    <Input
                      id="horario"
                      type="time"
                      value={formData.horario}
                      onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                      disabled={isClientLimitReached}
                    />
                  </div>

                  {sessionType !== 'pacote' && (
                    <>
                      <div className={isClientLimitReached ? 'opacity-50' : ''}>
                        <Label htmlFor="valor">Valor (R$) {!session && '*'}</Label>
                        <Input
                          id="valor"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={formData.valor}
                          onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                          disabled={isClientLimitReached}
                        />
                      </div>
                      <div className={isClientLimitReached ? 'opacity-50' : ''}>
                        <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                        <Select
                          value={formData.metodo_pagamento}
                          onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
                          disabled={isClientLimitReached}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Status (apenas em edição) */}
                  {session && (
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendada">Agendada</SelectItem>
                          <SelectItem value="realizada">Realizada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                          <SelectItem value="faltou">Falta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className={`col-span-2 ${isClientLimitReached ? 'opacity-50' : ''}`}>
                    <Label htmlFor="anotacoes">Observações</Label>
                    <Textarea
                      id="anotacoes"
                      placeholder="Observações sobre a sessão..."
                      value={formData.anotacoes}
                      onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                      rows={2}
                      disabled={isClientLimitReached}
                    />
                  </div>
                </div>
              )}

              {/* ===== CAMPOS PARA SESSÃO DE PACOTE ===== */}
              {sessionType === 'pacote' && !session && formData.client_id && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="package_id">Pacote *</Label>
                    <Select
                      value={formData.package_id}
                      onValueChange={(value) => setFormData({ ...formData, package_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um pacote" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg: any) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.nome} ({pkg.sessoes_consumidas}/{pkg.total_sessoes} usadas)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {packages.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Nenhum pacote ativo encontrado para este cliente.
                      </p>
                    )}
                  </div>

                  {formData.package_id && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data">Data *</Label>
                        <Input
                          id="data"
                          type="date"
                          value={formData.data}
                          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="horario">Horário *</Label>
                        <Input
                          id="horario"
                          type="time"
                          value={formData.horario}
                          onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="anotacoes">Observações</Label>
                        <Textarea
                          id="anotacoes"
                          placeholder="Observações sobre a sessão..."
                          value={formData.anotacoes}
                          onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== CAMPOS PARA SESSÃO RECORRENTE ===== */}
              {showRecurringOptions && formData.client_id && (
                <div className="space-y-4 border-t pt-4">
                  {/* Tipo de Cobrança */}
                  <div className="space-y-3">
                    <Label>Tipo de Cobrança</Label>
                    <RadioGroup
                      value={recurringData.billing_type}
                      onValueChange={(value: 'per_session' | 'monthly_plan') => 
                        setRecurringData({ ...recurringData, billing_type: value })
                      }
                      className="grid grid-cols-2 gap-2"
                    >
                      <Label htmlFor="billing-per-session" className="cursor-pointer">
                        <Card className={cn(
                          "transition-all h-full",
                          recurringData.billing_type === 'per_session' && "border-primary ring-2 ring-primary/20"
                        )}>
                          <CardContent className="p-3">
                            <RadioGroupItem value="per_session" id="billing-per-session" className="sr-only" />
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Por Sessão</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cada sessão gera um pagamento
                            </p>
                          </CardContent>
                        </Card>
                      </Label>

                      <Label htmlFor="billing-monthly" className="cursor-pointer">
                        <Card className={cn(
                          "transition-all h-full",
                          recurringData.billing_type === 'monthly_plan' && "border-primary ring-2 ring-primary/20"
                        )}>
                          <CardContent className="p-3">
                            <RadioGroupItem value="monthly_plan" id="billing-monthly" className="sr-only" />
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Plano Mensal</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Valor fixo mensal
                            </p>
                          </CardContent>
                        </Card>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Configurações da Recorrência */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="recurrence_type">Frequência</Label>
                      <Select
                        value={recurringData.recurrence_type}
                        onValueChange={(value: any) => setRecurringData({ ...recurringData, recurrence_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diária</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {recurringData.recurrence_type === 'semanal' && (
                      <div>
                        <Label htmlFor="dia_da_semana">Dia da Semana</Label>
                        <Select
                          value={recurringData.dia_da_semana?.toString()}
                          onValueChange={(value) => setRecurringData({ ...recurringData, dia_da_semana: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="horario">Horário *</Label>
                      <Input
                        id="horario"
                        type="time"
                        value={formData.horario}
                        onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                      />
                    </div>

                    {recurringData.billing_type === 'per_session' && (
                      <>
                        <div>
                          <Label htmlFor="valor">Valor por Sessão (R$) *</Label>
                          <Input
                            id="valor"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={formData.valor}
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                          <Select
                            value={formData.metodo_pagamento}
                            onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Configurações do Plano Mensal */}
                  {recurringData.billing_type === 'monthly_plan' && (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="h-4 w-4" />
                        Configurações do Plano Mensal
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="monthly_value">Valor Mensal (R$) *</Label>
                          <Input
                            id="monthly_value"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={recurringData.monthly_value || ''}
                            onChange={(e) => setRecurringData({ ...recurringData, monthly_value: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billing_day">Dia de Cobrança</Label>
                          <Select
                            value={recurringData.billing_day.toString()}
                            onValueChange={(value) => setRecurringData({ ...recurringData, billing_day: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Data de Início</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !recurringData.start_date && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {recurringData.start_date 
                                  ? format(recurringData.start_date, "dd/MM/yyyy", { locale: ptBR })
                                  : "Selecione"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={recurringData.start_date}
                                onSelect={(date) => date && setRecurringData({ ...recurringData, start_date: date })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="auto_renewal"
                            checked={recurringData.auto_renewal}
                            onCheckedChange={(checked) => setRecurringData({ ...recurringData, auto_renewal: checked })}
                          />
                          <Label htmlFor="auto_renewal" className="text-sm">Renovação automática</Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Término da Recorrência */}
                  <div className="space-y-3">
                    <Label>Término da Recorrência</Label>
                    <RadioGroup
                      value={recurringData.end_type}
                      onValueChange={(value: 'never' | 'date' | 'count') => 
                        setRecurringData({ ...recurringData, end_type: value })
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="never" id="end-never" />
                        <Label htmlFor="end-never" className="font-normal cursor-pointer">Sem data de término</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="date" id="end-date" />
                        <Label htmlFor="end-date" className="font-normal cursor-pointer">Até uma data específica</Label>
                        {recurringData.end_type === 'date' && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="ml-2">
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {recurringData.recurrence_end_date 
                                  ? format(recurringData.recurrence_end_date, "dd/MM/yyyy", { locale: ptBR })
                                  : "Selecione"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={recurringData.recurrence_end_date}
                                onSelect={(date) => date && setRecurringData({ ...recurringData, recurrence_end_date: date })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="count" id="end-count" />
                        <Label htmlFor="end-count" className="font-normal cursor-pointer">Após número de sessões</Label>
                        {recurringData.end_type === 'count' && (
                          <Input
                            type="number"
                            min="1"
                            className="w-20 ml-2"
                            value={recurringData.recurrence_count || ''}
                            onChange={(e) => setRecurringData({ ...recurringData, recurrence_count: parseInt(e.target.value) || undefined })}
                            placeholder="Ex: 10"
                          />
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4 border-t">
            <div>
              {session && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading || isClientLimitReached || (!formData.client_id)}
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
