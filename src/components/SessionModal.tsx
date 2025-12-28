import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { supabase } from "@/integrations/supabase/client"
import { formatCurrencyBR } from "@/utils/formatters"
import { formatTimeForDatabase } from "@/lib/utils"
import { CalendarIcon, Package, Repeat, User, DollarSign, Clock, FileText, Info } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { encryptSensitiveData } from "@/utils/encryptionMiddleware"

interface SessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: any | null
  selectedDate?: Date | null
  selectedClientId?: string | null
  onSuccess?: () => void
}

export const SessionModal = ({ 
  open, 
  onOpenChange, 
  session,
  selectedDate, 
  selectedClientId, 
  onSuccess 
}: SessionModalProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { canAddSession, planLimits } = useSubscription()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showReactivationMessage, setShowReactivationMessage] = useState(false)
  const [sessionType, setSessionType] = useState<'individual' | 'pacote' | 'recorrente'>('individual')
  
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
    staleTime: 0, // Always fetch fresh data when modal opens
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

  // Carregar sessões recorrentes ativas do cliente
  const { data: recurringSessionsList = [] } = useQuery({
    queryKey: ['recurring-sessions', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return []
      
      const { data, error } = await supabase
        .from('recurring_sessions')
        .select('id, horario, recurrence_type, recurrence_interval, valor, dia_da_semana, status, recurrence_end_date, recurrence_count, metodo_pagamento')
        .eq('client_id', formData.client_id)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!formData.client_id && open && sessionType === 'recorrente'
  })

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
          horario: "",
          valor: "",
          metodo_pagamento: "",
          status: "agendada",
          anotacoes: "",
          package_id: "",
          recurring_session_id: ""
        })
        setSessionType('individual')
      }
      setShowReactivationMessage(false)
    }
  }, [open, session, selectedDate, selectedClientId])

  // Verificar cliente inativo
  useEffect(() => {
    if (clients.length > 0 && formData.client_id) {
      const selectedClient = clients.find((c: any) => c.id === formData.client_id)
      setShowReactivationMessage(selectedClient && !selectedClient.ativo)
    }
  }, [clients, formData.client_id])

  const handleSave = async () => {
    if (!user) return

    // Validações
    if (!formData.client_id || !formData.data || !formData.horario) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha cliente, data e horário.",
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

    if (sessionType === 'recorrente' && !session && !formData.recurring_session_id) {
      toast({
        variant: "destructive",
        title: "Recorrência obrigatória",
        description: "Selecione uma sessão recorrente existente ou crie uma na página de Sessões Recorrentes.",
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
        // Se for sessão recorrente, apenas atualiza status e anotações
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
        
        // Nota: O pagamento é criado automaticamente pelo trigger create_payment_for_session

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
    // Para edição, verificar pelos IDs, não pelo sessionType
    if (session?.package_id) return <Package className="h-4 w-4" />
    if (session?.recurring_session_id) return <Repeat className="h-4 w-4" />
    
    // Para criação, usar o sessionType selecionado
    if (!session) {
      switch (sessionType) {
        case 'pacote': return <Package className="h-4 w-4" />
        case 'recorrente': return <Repeat className="h-4 w-4" />
        default: return null // Não mostrar ícone para individual
      }
    }
    
    return null // Não mostrar ícone para individual
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSessionTypeIcon()}
            {session ? (isEditingRecurringSession ? 'Editar Sessão Recorrente' : 'Editar Sessão') : 'Nova Sessão'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de Sessão (apenas na criação) */}
          {!session && (
            <Tabs value={sessionType} onValueChange={(v: any) => setSessionType(v)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">
                  <User className="h-4 w-4 mr-2" />
                  Individual
                </TabsTrigger>
                <TabsTrigger value="pacote">
                  <Package className="h-4 w-4 mr-2" />
                  Pacote
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Se é edição de sessão recorrente, mostrar apenas status e observações */}
            {isEditingRecurringSession ? (
              <>
                {/* Aviso sobre edição limitada */}
                <Alert className="col-span-2 bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Esta é uma sessão recorrente. Para editar cliente, data, horário, valor ou método de pagamento, acesse a página de <strong>Sessões Recorrentes</strong>.
                  </AlertDescription>
                </Alert>

                {/* Status */}
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

                {/* Espaço vazio para alinhar grid */}
                <div className="hidden sm:block" />

                {/* Anotações */}
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
              </>
            ) : (
              <>
                {/* Cliente */}
                <div className="col-span-2">
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    disabled={!!session} // Não permite trocar cliente em edição
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

                {/* Pacote (se tipo = pacote) */}
                {sessionType === 'pacote' && (
                  <div className="col-span-2">
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
                  </div>
                )}


                {/* Data */}
                <div>
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  />
                </div>

                {/* Horário */}
                <div>
                  <Label htmlFor="horario">Horário *</Label>
                  <Input
                    id="horario"
                    type="time"
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  />
                </div>

                {/* Valor e Método de Pagamento (apenas se não for de pacote) */}
                {sessionType !== 'pacote' && (
                  <>
                    <div>
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                      <Select
                        value={formData.metodo_pagamento}
                        onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Status (apenas em edição de sessão não-recorrente) */}
                {session && !isEditingRecurringSession && (
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

                {/* Observações */}
                <div className="col-span-2">
                  <Label htmlFor="anotacoes">Observações</Label>
                  <Textarea
                    id="anotacoes"
                    placeholder="Observações sobre a sessão..."
                    value={formData.anotacoes}
                    onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4">
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
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Salvando...' : session ? 'Atualizar' : 'Criar Sessão'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
