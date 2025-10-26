import { useState } from "react"
import { Layout } from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RecurringSessionModal } from "@/components/RecurringSessionModal"
import { useRecurringSessions } from "@/hooks/useRecurringSessions"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Repeat, Plus, Edit, Trash2, Calendar, Clock, DollarSign, User } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function SessoesRecorrentes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { deleteRecurring, loading } = useRecurringSessions()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

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
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })

  // Carregar clientes
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome')
        .eq('user_id', user!.id)
        .order('nome')
      
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })

  // Contar instâncias geradas
  const { data: instanceCounts = {} } = useQuery({
    queryKey: ['recurring-instances-count', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('recurring_session_id')
        .eq('user_id', user!.id)
        .not('recurring_session_id', 'is', null)
      
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

  const handleSave = () => {
    refetch()
    setSelectedRecurring(null)
    setSelectedClientId(null)
  }

  const handleOpenNewRecurring = () => {
    if (clients.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum cliente cadastrado',
        description: 'Cadastre um cliente antes de criar uma recorrência.',
      })
      return
    }
    setShowClientSelector(true)
  }

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId)
    setShowClientSelector(false)
    setIsModalOpen(true)
  }

  const getRecurrenceDescription = (recurring: any) => {
    const parts = []
    
    if (recurring.recurrence_type === 'semanal') {
      parts.push(`Toda ${WEEKDAYS[recurring.dia_da_semana || 1]}`)
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
      case 'concluida':
        return <Badge variant="outline">Concluída</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Repeat className="h-8 w-8 text-primary" />
              Sessões Recorrentes
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie sessões que se repetem automaticamente
            </p>
          </div>
          
          <Button onClick={handleOpenNewRecurring} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Nova Recorrência
          </Button>
        </div>

        {recurringSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma sessão recorrente</h3>
              <p className="text-muted-foreground mb-4">
                Configure sessões que se repetem automaticamente
              </p>
              <Button onClick={handleOpenNewRecurring}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira recorrência
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recurringSessions.map((recurring) => (
              <Card key={recurring.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold text-lg">
                          {recurring.clients?.nome || 'Cliente não encontrado'}
                        </span>
                        {getStatusBadge(recurring.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{getRecurrenceDescription(recurring)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{recurring.horario}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrencyBR(recurring.valor || 0)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {instanceCounts[recurring.id] || 0} sessões geradas
                        </span>
                        {recurring.google_calendar_sync && (
                          <Badge variant="outline" className="text-xs">
                            Sync Google Calendar
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(recurring)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteConfirmId(recurring.id)}
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

        <Dialog open={showClientSelector} onOpenChange={setShowClientSelector}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecione o Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clients.map((client) => (
                <Button
                  key={client.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSelectClient(client.id)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {client.nome}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <RecurringSessionModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open)
            if (!open) {
              setSelectedRecurring(null)
              setSelectedClientId(null)
            }
          }}
          recurringSession={selectedRecurring}
          clientId={selectedClientId || undefined}
          onSave={handleSave}
        />

        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir sessão recorrente?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá excluir a configuração de recorrência e todas as sessões futuras associadas.
                Sessões passadas serão mantidas.
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
      </div>
    </Layout>
  )
}
