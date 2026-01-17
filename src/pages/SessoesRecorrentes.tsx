import { useState, useEffect } from "react"
import { Layout } from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RecurringSessionModal } from "@/components/RecurringSessionModal"
import { useRecurringSessions } from "@/hooks/useRecurringSessions"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Repeat, Pencil, Trash2, Calendar, Clock, DollarSign, Pause, Play, CreditCard, CalendarDays, Info } from "lucide-react"
import { ClientAvatar } from "@/components/ClientAvatar"
import { formatCurrencyBR } from "@/utils/formatters"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function SessoesRecorrentes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { deleteRecurring, updateRecurring, loading } = useRecurringSessions()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [pauseConfirmId, setPauseConfirmId] = useState<string | null>(null)
  const [pauseAction, setPauseAction] = useState<'pause' | 'resume'>('pause')

  // Carregar sessões recorrentes
  const { data: recurringSessions = [], refetch } = useQuery({
    queryKey: ['recurring-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_sessions')
        .select(`
          *,
          clients:client_id (
            id,
            nome,
            avatar_url
          ),
          monthly_plans:monthly_plan_id (
            id,
            nome,
            valor_mensal,
            status
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always'
  })

  // Refetch on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refetch()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, refetch])

  // Contar instâncias geradas (futuras)
  const { data: instanceCounts = {} } = useQuery({
    queryKey: ['recurring-instances-count', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('sessions')
        .select('recurring_session_id')
        .eq('user_id', user!.id)
        .not('recurring_session_id', 'is', null)
        .gte('data', today)
      
      if (error) throw error
      
      const counts: Record<string, number> = {}
      data?.forEach(session => {
        if (session.recurring_session_id) {
          counts[session.recurring_session_id] = (counts[session.recurring_session_id] || 0) + 1
        }
      })
      
      return counts
    },
    enabled: !!user
  })

  const handleEdit = (recurring: any) => {
    setSelectedRecurring(recurring)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await deleteRecurring(id, true)
    setDeleteConfirmId(null)
    refetch()
  }

  const handlePauseResume = async (id: string, action: 'pause' | 'resume') => {
    try {
      const newStatus = action === 'pause' ? 'pausada' : 'ativa'
      
      await updateRecurring(id, { status: newStatus }, false)
      
      // Se pausando, atualizar todas as sessões futuras para pausadas
      if (action === 'pause') {
        const today = new Date().toISOString().split('T')[0]
        await supabase
          .from('sessions')
          .update({ status: 'pausada' })
          .eq('recurring_session_id', id)
          .gte('data', today)
          .eq('status', 'agendada')
        
        // Se tem plano mensal, pausar também
        const recurring = recurringSessions.find(r => r.id === id)
        if (recurring?.monthly_plan_id) {
          await supabase
            .from('monthly_plans')
            .update({ status: 'pausado' })
            .eq('id', recurring.monthly_plan_id)
        }
      } else {
        // Se retomando, reativar sessões que estavam pausadas
        const today = new Date().toISOString().split('T')[0]
        await supabase
          .from('sessions')
          .update({ status: 'agendada' })
          .eq('recurring_session_id', id)
          .gte('data', today)
          .eq('status', 'pausada')
        
        // Se tem plano mensal, reativar também
        const recurring = recurringSessions.find(r => r.id === id)
        if (recurring?.monthly_plan_id) {
          await supabase
            .from('monthly_plans')
            .update({ status: 'ativo' })
            .eq('id', recurring.monthly_plan_id)
        }
      }
      
      toast({
        title: action === 'pause' ? 'Recorrência pausada' : 'Recorrência retomada',
        description: action === 'pause' 
          ? 'Todas as sessões futuras foram pausadas.'
          : 'As sessões futuras foram reativadas.',
      })
      
      refetch()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      })
    }
    setPauseConfirmId(null)
  }

  const handleSave = () => {
    refetch()
    setSelectedRecurring(null)
  }

  const getRecurrenceDescription = (recurring: any) => {
    const parts = []
    
    if (recurring.recurrence_type === 'semanal') {
      const dayOfWeek = recurring.dia_da_semana || 1
      // Sábado (6) e Domingo (0) são masculinos: "Todo"
      // Os outros dias são femininos: "Toda"
      const prefix = dayOfWeek === 0 || dayOfWeek === 6 ? 'Todo' : 'Toda'
      parts.push(`${prefix} ${WEEKDAYS[dayOfWeek]}`)
    } else if (recurring.recurrence_type === 'quinzenal') {
      parts.push(`A cada 2 semanas`)
    } else if (recurring.recurrence_type === 'mensal') {
      parts.push(`Mensal`)
    } else {
      parts.push(`Diária`)
    }
    
    if (recurring.recurrence_end_date) {
      parts.push(`até ${format(new Date(recurring.recurrence_end_date), 'dd/MM/yyyy', { locale: ptBR })}`)
    } else if (recurring.recurrence_count) {
      parts.push(`(${recurring.recurrence_count} sessões)`)
    } else {
      parts.push('(sem término)')
    }
    
    return parts.join(' ')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativa':
        return <Badge variant="success">Ativa</Badge>
      case 'pausada':
        return <Badge variant="warning">Pausada</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      case 'concluida':
        return <Badge variant="outline">Concluída</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getBillingTypeBadge = (recurring: any) => {
    if (recurring.billing_type === 'monthly_plan') {
      return (
        <Badge variant="secondary" className="gap-1">
          <CalendarDays className="h-3 w-3" />
          Plano Mensal
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1">
        <CreditCard className="h-3 w-3" />
        Por Sessão
      </Badge>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Repeat className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="break-words">Sessões Recorrentes</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Gerencie suas regras de recorrência
            </p>
          </div>
        </div>

        {/* Informativo sobre criação */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para criar uma nova sessão recorrente, utilize o modal de nova sessão na página de <strong>Sessões</strong> ou na <strong>Agenda</strong> e selecione a aba "Recorrente".
          </AlertDescription>
        </Alert>

        {recurringSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma sessão recorrente</h3>
              <p className="text-muted-foreground mb-4">
                Crie sessões recorrentes através do modal de nova sessão na página de Sessões ou Agenda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recurringSessions.map((recurring) => (
              <Card key={recurring.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <ClientAvatar 
                          avatarPath={recurring.clients?.avatar_url}
                          clientName={recurring.clients?.nome || 'Cliente'}
                          size="sm"
                        />
                        <span className="font-semibold text-base sm:text-lg break-words">
                          {recurring.clients?.nome || 'Cliente não encontrado'}
                        </span>
                        {getStatusBadge(recurring.status)}
                        {getBillingTypeBadge(recurring)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="break-words">{getRecurrenceDescription(recurring)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{recurring.horario}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          {recurring.billing_type === 'monthly_plan' && recurring.monthly_plans ? (
                            <span>{formatCurrencyBR(recurring.monthly_plans.valor_mensal || 0)}/mês</span>
                          ) : (
                            <span>{formatCurrencyBR(recurring.valor || 0)}/sessão</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <span>
                          {instanceCounts[recurring.id] || 0} sessões futuras
                        </span>
                        {recurring.google_calendar_sync && (
                          <Badge variant="outline" className="text-xs">
                            Sync Google Calendar
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 self-end sm:self-start">
                      {/* Botão Pausar/Retomar */}
                      {recurring.status === 'ativa' ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setPauseConfirmId(recurring.id)
                            setPauseAction('pause')
                          }}
                          title="Pausar recorrência"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : recurring.status === 'pausada' ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setPauseConfirmId(recurring.id)
                            setPauseAction('resume')
                          }}
                          title="Retomar recorrência"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : null}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(recurring)}
                        title="Editar recorrência"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteConfirmId(recurring.id)}
                        title="Excluir recorrência"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <RecurringSessionModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open)
            if (!open) {
              setSelectedRecurring(null)
            }
          }}
          recurringSession={selectedRecurring}
          onSave={handleSave}
        />

        {/* Diálogo de confirmação de exclusão */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir sessão recorrente?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá excluir a configuração de recorrência e todas as sessões futuras associadas.
                Sessões passadas serão mantidas.
                {recurringSessions.find(r => r.id === deleteConfirmId)?.billing_type === 'monthly_plan' && (
                  <span className="block mt-2 font-medium text-warning">
                    ⚠️ O plano mensal associado também será encerrado e todas as cobranças futuras serão canceladas.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de confirmação de pausar/retomar */}
        <AlertDialog open={!!pauseConfirmId} onOpenChange={(open) => !open && setPauseConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pauseAction === 'pause' ? 'Pausar recorrência?' : 'Retomar recorrência?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pauseAction === 'pause' ? (
                  <>
                    Todas as sessões futuras serão pausadas e nenhuma nova sessão será gerada enquanto a recorrência estiver pausada.
                    {recurringSessions.find(r => r.id === pauseConfirmId)?.billing_type === 'monthly_plan' && (
                      <span className="block mt-2 font-medium text-warning">
                        ⚠️ O plano mensal associado também será pausado e nenhuma nova cobrança será gerada.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    As sessões futuras serão reativadas e a recorrência voltará a gerar novas sessões normalmente.
                    {recurringSessions.find(r => r.id === pauseConfirmId)?.billing_type === 'monthly_plan' && (
                      <span className="block mt-2 font-medium text-primary">
                        ✓ O plano mensal associado também será reativado.
                      </span>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => pauseConfirmId && handlePauseResume(pauseConfirmId, pauseAction)}
              >
                {pauseAction === 'pause' ? 'Pausar' : 'Retomar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}