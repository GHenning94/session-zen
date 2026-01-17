import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { formatTimeForDatabase } from "@/lib/utils"
import { Package, Repeat, Info, CalendarRange } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { recalculateMultiplePackages } from "@/utils/packageUtils"
import { RecurringEditConfirmModal, RecurringEditChoice } from "./RecurringEditConfirmModal"
import { useRecurringSessions } from "@/hooks/useRecurringSessions"

// Função para atualizar evento no Google Calendar
const updateGoogleCalendarEvent = async (session: any, clientName: string): Promise<boolean> => {
  const accessToken = localStorage.getItem('google_access_token')
  if (!accessToken || !session.google_event_id) return false

  try {
    const startDateTime = new Date(`${session.data}T${session.horario}`)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    const googleEvent = {
      summary: clientName,
      description: session.anotacoes || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${session.google_event_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent)
      }
    )

    if (!response.ok) {
      console.error('Erro ao atualizar evento no Google:', response.status)
      return false
    }

    // Atualizar timestamp de sincronização
    await supabase
      .from('sessions')
      .update({ google_last_synced: new Date().toISOString() })
      .eq('id', session.id)

    return true
  } catch (error) {
    console.error('Erro ao atualizar evento no Google:', error)
    return false
  }
}

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
  const { unlinkSessionFromRecurring, updateAllFutureInstances } = useRecurringSessions()
  const [formData, setFormData] = useState({
    client_id: '',
    data: '',
    horario: '',
    valor: '',
    metodo_pagamento: '',
    status: '',
    anotacoes: ''
  })
  const [loading, setLoading] = useState(false)
  const [showReactivationMessage, setShowReactivationMessage] = useState(false)
  const [showRecurringConfirm, setShowRecurringConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<typeof formData | null>(null)

  // Fetch package data for package sessions
  const { data: packageData } = useQuery({
    queryKey: ['package-for-session', session?.package_id],
    queryFn: async () => {
      if (!session?.package_id) return null
      const { data, error } = await supabase
        .from('packages')
        .select('id, valor_por_sessao, valor_total, total_sessoes')
        .eq('id', session.package_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!session?.package_id && open
  })

  // Fetch clients with active packages for package sessions
  const { data: clientsWithPackages } = useQuery({
    queryKey: ['clients-with-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('client_id')
        .eq('status', 'ativo')
      if (error) throw error
      return new Set(data?.map(p => p.client_id) || [])
    },
    enabled: !!session?.package_id && open
  })

  // Filter clients for package sessions - only show clients with active packages
  const availableClients = session?.package_id 
    ? clients.filter(c => clientsWithPackages?.has(c.id))
    : clients

  // Calculate package session value
  const getPackageSessionValue = (): number => {
    if (!packageData) return session?.valor || 0
    if (packageData.valor_por_sessao) return packageData.valor_por_sessao
    if (packageData.valor_total && packageData.total_sessoes) {
      return packageData.valor_total / packageData.total_sessoes
    }
    return session?.valor || 0
  }

  useEffect(() => {
    if (session) {
      setFormData({
        client_id: session.client_id || '',
        data: session.data || '',
        horario: session.horario ? session.horario.slice(0, 5) : '',
        valor: session.valor?.toString() || '',
        metodo_pagamento: session.metodo_pagamento || '',
        status: session.status || 'agendada',
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


  // Verificar se a sessão é somente leitura (importada do Google)
  const isReadOnly = session?.google_sync_type === 'importado'
  
  // Verificar se é uma sessão recorrente
  const isRecurringSession = !!session?.recurring_session_id && !session?.unlinked_from_recurring

  // Check if session is from a package
  const isPackageSession = !!session?.package_id

  // Fetch recurring session data for monthly plan check
  const { data: recurringData } = useQuery({
    queryKey: ['recurring-for-session', session?.recurring_session_id],
    queryFn: async () => {
      if (!session?.recurring_session_id) return null
      const { data, error } = await supabase
        .from('recurring_sessions')
        .select('id, billing_type, monthly_plan_id, valor, metodo_pagamento')
        .eq('id', session.recurring_session_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!session?.recurring_session_id && open
  })

  const isMonthlyPlanRecurring = recurringData?.billing_type === 'monthly_plan'

  // Fetch available packages for the selected client
  const { data: availablePackages = [] } = useQuery({
    queryKey: ['packages-for-client', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return []
      const { data, error } = await supabase
        .from('packages')
        .select('id, nome, total_sessoes, sessoes_consumidas, status')
        .eq('client_id', formData.client_id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!formData.client_id && isPackageSession && open
  })

  // State for selected package
  const [selectedPackageId, setSelectedPackageId] = useState<string>(session?.package_id || '')

  // Update selectedPackageId when session changes
  useEffect(() => {
    if (session?.package_id) {
      setSelectedPackageId(session.package_id)
    }
  }, [session?.package_id])


  // Verificar se apenas campos individuais (status/anotações) foram alterados
  const onlyIndividualFieldsChanged = (): boolean => {
    if (!session) return false
    
    const originalData = {
      client_id: session.client_id || '',
      data: session.data || '',
      horario: session.horario ? session.horario.slice(0, 5) : '',
      valor: session.valor?.toString() || '',
      metodo_pagamento: session.metodo_pagamento || '',
    }
    
    // Verificar se os campos "coletivos" mudaram
    const clientChanged = formData.client_id !== originalData.client_id
    const dateChanged = formData.data !== originalData.data
    const timeChanged = formData.horario !== originalData.horario
    const valueChanged = formData.valor !== originalData.valor
    const paymentMethodChanged = formData.metodo_pagamento !== originalData.metodo_pagamento
    
    // Se nenhum campo coletivo mudou, então só mudou status/anotações (campos individuais)
    return !clientChanged && !dateChanged && !timeChanged && !valueChanged && !paymentMethodChanged
  }

  const handleSave = async () => {
    if (!session) return

    // Se for sessão recorrente MAS apenas status/anotações foram alterados,
    // salvar diretamente sem mostrar modal de confirmação (edição sempre individual)
    if (isRecurringSession && onlyIndividualFieldsChanged()) {
      await performSaveStatusAndNotes()
      return
    }

    // Se for sessão recorrente e outros campos foram alterados, mostrar modal de confirmação
    if (isRecurringSession && !showRecurringConfirm) {
      setPendingFormData(formData)
      setShowRecurringConfirm(true)
      return
    }

    await performSave(formData)
  }

  // Função para salvar apenas status e anotações (sempre individual, sem desvincular)
  const performSaveStatusAndNotes = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          status: formData.status,
          anotacoes: formData.anotacoes || null
        })
        .eq('id', session.id)

      if (error) throw error

      toast({
        title: "Sessão atualizada",
        description: "Status e observações foram salvos com sucesso.",
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

  const handleRecurringEditChoice = async (choice: RecurringEditChoice) => {
    if (!pendingFormData) return

    if (choice === 'this_only') {
      // Desvincular sessão e salvar como individual
      await unlinkSessionFromRecurring(session.id)
      await performSaveAsIndividual(pendingFormData)
    } else {
      // Atualizar todas as sessões futuras
      await performSaveAllFuture(pendingFormData)
    }
    
    setPendingFormData(null)
  }

  const performSaveAsIndividual = async (data: typeof formData) => {
    setLoading(true)
    try {
      // Verificar se o cliente está inativo e reativá-lo se necessário
      const selectedClient = clients.find(c => c.id === data.client_id)
      if (selectedClient && !selectedClient.ativo) {
        await supabase
          .from('clients')
          .update({ ativo: true })
          .eq('id', data.client_id)
      }

      const valorNumerico = parseFloat(data.valor) || null

      const { error } = await supabase
        .from('sessions')
        .update({
          client_id: data.client_id,
          data: data.data,
          horario: formatTimeForDatabase(data.horario),
          valor: valorNumerico,
          metodo_pagamento: data.metodo_pagamento || null,
          status: data.status,
          anotacoes: data.anotacoes || null
        })
        .eq('id', session.id)

      if (error) throw error

      // Criar/atualizar pagamento
      if (valorNumerico && valorNumerico > 0) {
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('session_id', session.id)
          .maybeSingle()

        if (existingPayment) {
          await supabase
            .from('payments')
            .update({
              valor: valorNumerico,
              metodo_pagamento: data.metodo_pagamento || 'A definir'
            })
            .eq('session_id', session.id)
        } else {
          await supabase
            .from('payments')
            .insert([{
              user_id: session.user_id,
              session_id: session.id,
              client_id: data.client_id,
              valor: valorNumerico,
              status: 'pendente',
              data_vencimento: data.data,
              metodo_pagamento: data.metodo_pagamento || 'A definir',
              payment_type: 'session'
            }])
        }
      }

      toast({
        title: "Sessão atualizada",
        description: "A sessão foi desvinculada da recorrência e atualizada como sessão individual.",
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

  const performSaveAllFuture = async (data: typeof formData) => {
    setLoading(true)
    try {
      const valorNumerico = parseFloat(data.valor) || null

      // Calcular diferença de dias entre a data original e a nova data
      const originalDate = new Date(session.data + 'T12:00:00')
      const targetDate = new Date(data.data + 'T12:00:00')
      const dayDiff = Math.round((targetDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24))
      const dateChanged = dayDiff !== 0

      console.log('performSaveAllFuture - recurring_session_id:', session.recurring_session_id)
      console.log('performSaveAllFuture - data original:', session.data, '-> nova data:', data.data, 'diff:', dayDiff)

      // Buscar TODAS as sessões futuras da série (incluindo a atual)
      const { data: futureSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, data')
        .eq('recurring_session_id', session.recurring_session_id)
        .gte('data', session.data) // A partir da data da sessão atual

      console.log('performSaveAllFuture - sessões encontradas:', futureSessions?.length, futureSessions)

      if (fetchError) {
        console.error('Erro ao buscar sessões futuras:', fetchError)
        throw fetchError
      }

      // Verificar se há outras sessões futuras além da atual
      const otherFutureSessions = futureSessions?.filter(s => s.id !== session.id) || []
      const hasOtherFutureSessions = otherFutureSessions.length > 0

      // Atualizar TODAS as sessões futuras (a partir da data da sessão atual)
      let updateErrors = 0
      for (const futureSession of futureSessions || []) {
        const updateData: any = {
          horario: formatTimeForDatabase(data.horario),
          status: data.status,
          anotacoes: data.anotacoes || null
        }

        // Se a data foi alterada, calcular nova data para esta sessão
        if (dateChanged) {
          const futureOriginalDate = new Date(futureSession.data + 'T12:00:00')
          futureOriginalDate.setDate(futureOriginalDate.getDate() + dayDiff)
          const futureNewDate = futureOriginalDate.toISOString().split('T')[0]
          updateData.data = futureNewDate
          console.log('Atualizando sessão', futureSession.id, 'de', futureSession.data, 'para', futureNewDate)
        }

        // Só atualizar valor e método se não for plano mensal
        if (!isMonthlyPlanRecurring) {
          updateData.valor = valorNumerico
          updateData.metodo_pagamento = data.metodo_pagamento || null
        }

        const { error } = await supabase
          .from('sessions')
          .update(updateData)
          .eq('id', futureSession.id)

        if (error) {
          console.error('Erro ao atualizar sessão:', futureSession.id, error)
          updateErrors++
        }
      }

      // Atualizar a regra de recorrência também
      const recurringUpdate: any = {
        horario: formatTimeForDatabase(data.horario)
      }
      
      // Se a data foi alterada, atualizar o dia da semana na recorrência
      if (dateChanged) {
        recurringUpdate.dia_da_semana = targetDate.getDay()
      }
      
      if (!isMonthlyPlanRecurring) {
        recurringUpdate.valor = valorNumerico
        recurringUpdate.metodo_pagamento = data.metodo_pagamento || null
      }

      const { error: recurringError } = await supabase
        .from('recurring_sessions')
        .update(recurringUpdate)
        .eq('id', session.recurring_session_id)

      if (recurringError) {
        console.error('Erro ao atualizar recorrência:', recurringError)
      }

      // Atualizar pagamentos pendentes das sessões futuras se não for plano mensal
      if (!isMonthlyPlanRecurring && valorNumerico && futureSessions && futureSessions.length > 0) {
        const sessionIds = futureSessions.map(s => s.id)
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            valor: valorNumerico,
            metodo_pagamento: data.metodo_pagamento || 'A definir'
          })
          .in('session_id', sessionIds)
          .eq('status', 'pendente')

        if (paymentError) {
          console.error('Erro ao atualizar pagamentos:', paymentError)
        }
      }

      // Mostrar mensagem apropriada
      if (updateErrors > 0) {
        toast({
          title: "Aviso",
          description: `${(futureSessions?.length || 0) - updateErrors} de ${futureSessions?.length || 0} sessões foram atualizadas.`,
          variant: "destructive"
        })
      } else if (!hasOtherFutureSessions) {
        toast({
          title: "Sessão atualizada",
          description: "Não existem sessões futuras para aplicar esta alteração. A alteração foi aplicada apenas a esta sessão.",
        })
      } else {
        toast({
          title: "Série atualizada",
          description: `${futureSessions?.length || 0} sessão(ões) atualizada(s) com sucesso.`,
        })
      }

      // Disparar evento para atualizar outras telas
      window.dispatchEvent(new Event('recurringSessionUpdated'))

      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao atualizar série:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as sessões.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const performSave = async (data: typeof formData) => {
    setLoading(true)
    try {
      // Se for importada (read-only), só atualiza valor e método de pagamento
      if (isReadOnly) {
        const valorNumerico = parseFloat(formData.valor) || null

        const { error } = await supabase
          .from('sessions')
          .update({
            valor: valorNumerico,
            metodo_pagamento: formData.metodo_pagamento || null
          })
          .eq('id', session.id)

        if (error) throw error

        // Verificar se já existe pagamento para esta sessão
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('session_id', session.id)
          .maybeSingle()

        if (existingPayment) {
          // Atualizar pagamento existente
          await supabase
            .from('payments')
            .update({
              valor: valorNumerico || 0,
              metodo_pagamento: formData.metodo_pagamento || 'A definir'
            })
            .eq('session_id', session.id)
        } else if (valorNumerico && valorNumerico > 0) {
          // Criar pagamento novo se definiu valor
          await supabase
            .from('payments')
            .insert([{
              user_id: session.user_id,
              session_id: session.id,
              client_id: session.client_id,
              valor: valorNumerico,
              status: 'pendente',
              data_vencimento: session.data,
              metodo_pagamento: formData.metodo_pagamento || 'A definir'
            }])
        }

        toast({
          title: "Sessão atualizada",
          description: "Valor e método de pagamento atualizados com sucesso.",
        })

        onSessionUpdated()
        onOpenChange(false)
        return
      }

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

      const valorNumerico = parseFloat(formData.valor) || null

      // Atualizar sessão
      const updateData: any = {
        client_id: formData.client_id,
        data: formData.data,
        horario: formatTimeForDatabase(formData.horario),
        valor: valorNumerico,
        metodo_pagamento: formData.metodo_pagamento || null,
        status: formData.status,
        anotacoes: formData.anotacoes || null
      }

      // Se for sessão de pacote e o pacote foi alterado
      if (isPackageSession && selectedPackageId && selectedPackageId !== session.package_id) {
        updateData.package_id = selectedPackageId
      }

      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', session.id)

      if (error) {
        throw error
      }

      // Se sessão espelhada, sincronizar alterações com Google Calendar
      if (session.google_sync_type === 'espelhado' && session.google_event_id) {
        const selectedClientName = clients.find(c => c.id === formData.client_id)?.nome || 'Cliente'
        const updatedSession = {
          ...session,
          data: formData.data,
          horario: formatTimeForDatabase(formData.horario),
          anotacoes: formData.anotacoes || null
        }
        const googleUpdated = await updateGoogleCalendarEvent(updatedSession, selectedClientName)
        if (googleUpdated) {
          toast({
            title: "Sincronizado com Google",
            description: "Alterações enviadas para o Google Calendar.",
          })
        }
      }

      // Verificar se já existe pagamento para esta sessão
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('session_id', session.id)
        .maybeSingle()

      if (existingPayment) {
        // Atualizar pagamento existente
        await supabase
          .from('payments')
          .update({
            valor: valorNumerico || 0,
            metodo_pagamento: formData.metodo_pagamento || 'A definir'
          })
          .eq('session_id', session.id)
      } else if (valorNumerico && valorNumerico > 0) {
        // Criar pagamento novo se definiu valor
        await supabase
          .from('payments')
          .insert([{
            user_id: session.user_id,
            session_id: session.id,
            client_id: session.client_id,
            valor: valorNumerico,
            status: 'pendente',
            data_vencimento: formData.data,
            metodo_pagamento: formData.metodo_pagamento || 'A definir'
          }])
      }

      // Recalculate package consumption if package changed or status changed for package session
      const affectedPackageIds: string[] = []
      if (isPackageSession) {
        if (session.package_id) affectedPackageIds.push(session.package_id)
        if (selectedPackageId && selectedPackageId !== session.package_id) {
          affectedPackageIds.push(selectedPackageId)
        }
      }
      
      if (affectedPackageIds.length > 0) {
        await recalculateMultiplePackages(affectedPackageIds)
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

  // Modal para sessões importadas (edição limitada)
  if (isReadOnly) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar Valor e Pagamento
            </DialogTitle>
          </DialogHeader>
          
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta sessão foi importada do Google Calendar. Apenas o valor e método de pagamento podem ser editados para fins de métricas.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 mt-4">
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
              <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
              <Select
                value={formData.metodo_pagamento}
                onValueChange={(value) => setFormData(prev => ({ ...prev, metodo_pagamento: value }))}
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

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
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

  // Modal para sessões recorrentes - Agora com edição completa + modal de confirmação
  if (isRecurringSession) {
    return (
      <>
        <RecurringEditConfirmModal
          open={showRecurringConfirm}
          onOpenChange={setShowRecurringConfirm}
          onConfirm={handleRecurringEditChoice}
          sessionDate={session?.data}
        />
        
        <Dialog open={open && !showRecurringConfirm} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                Editar Sessão Recorrente
                {isMonthlyPlanRecurring && (
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                    <CalendarRange className="h-3 w-3 mr-1" />
                    Plano mensal
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <Alert className="bg-accent/50 border-accent">
              <CalendarRange className="h-4 w-4" />
              <AlertDescription>
                Esta sessão faz parte de uma série recorrente. Ao salvar, você escolherá se deseja alterar apenas esta ou todas as sessões futuras.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mt-2">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Valor e método de pagamento - apenas se não for plano mensal */}
              {isMonthlyPlanRecurring ? (
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Esta sessão está vinculada a um plano mensal. O valor é fixo mensal e não há cobrança por sessão.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                    <Select
                      value={formData.metodo_pagamento}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, metodo_pagamento: value }))}
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
                </div>
              )}

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                    <SelectItem value="faltou">Falta</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="anotacoes">Anotações</Label>
                <Textarea
                  id="anotacoes"
                  value={formData.anotacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, anotacoes: e.target.value }))}
                  placeholder="Observações sobre a sessão..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
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
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPackageSession ? (
              <>
                <Package className="h-4 w-4" />
                Editar Sessão de Pacote
              </>
            ) : (
              <>Editar Sessão Individual</>
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
                {availableClients.map((client) => (
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
            {isPackageSession && (
              <p className="text-xs text-muted-foreground mt-1">
                Apenas clientes com pacotes ativos são exibidos.
              </p>
            )}
            {showReactivationMessage && (
              <div className="text-sm p-2 bg-warning/10 border border-warning/20 rounded-md text-warning">
                Ao salvar, este cliente será reativado automaticamente.
              </div>
            )}
          </div>

          {/* Seletor de Pacote para sessões de pacote */}
          {isPackageSession && (
            <div>
              <Label htmlFor="package">Pacote</Label>
              <Select
                value={selectedPackageId}
                onValueChange={setSelectedPackageId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pacote" />
                </SelectTrigger>
                <SelectContent>
                  {availablePackages.map((pkg: any) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.nome} ({pkg.sessoes_consumidas}/{pkg.total_sessoes} usadas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* For package sessions, show value as read-only and hide payment method */}
          {isPackageSession ? (
            <div>
              <Label htmlFor="valor">Valor (definido pelo pacote)</Label>
              <Input
                id="valor"
                type="text"
                value={`R$ ${getPackageSessionValue().toFixed(2)}`}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O valor e método de pagamento são definidos no pacote.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                <Select
                  value={formData.metodo_pagamento}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, metodo_pagamento: value }))}
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
            </div>
          )}

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="faltou">Falta</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
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