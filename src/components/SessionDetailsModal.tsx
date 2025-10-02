import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CreditCard,
  Eye,
  StickyNote
} from "lucide-react"
import { formatCurrencyBR, formatTimeBR, formatDateBR } from "@/utils/formatters"
import { TextPreview } from "./TextPreview"

interface SessionDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: any
  onEdit: (session: any) => void
  onDelete: (sessionId: string) => void
  onCancel: (sessionId: string) => void
  onMarkNoShow: (sessionId: string) => void
  onViewAgenda: (sessionId: string) => void
  onViewPayment: (sessionId: string) => void
  onAddNote: (session: any) => void
}

export const SessionDetailsModal = ({
  open,
  onOpenChange,
  session,
  onEdit,
  onDelete,
  onCancel,
  onMarkNoShow,
  onViewAgenda,
  onViewPayment,
  onAddNote
}: SessionDetailsModalProps) => {
  if (!session) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada': return 'default'
      case 'agendada': return 'secondary'
      case 'cancelada': return 'destructive'
      case 'falta': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizada': return 'Realizada'
      case 'agendada': return 'Agendada'
      case 'cancelada': return 'Cancelada'
      case 'falta': return 'Falta'
      default: return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{session.clients?.nome || 'Cliente não encontrado'}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusColor(session.status)}>
                  {getStatusLabel(session.status)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Informações da Sessão */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Informações da Sessão
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Data</label>
                  <p className="font-medium">{formatDateBR(session.data)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Horário</label>
                  <p className="font-medium">{formatTimeBR(session.horario)}</p>
                </div>
                {session.valor && (
                  <div>
                    <label className="text-sm text-muted-foreground">Valor</label>
                    <p className="font-medium">{formatCurrencyBR(session.valor)}</p>
                  </div>
                )}
                {session.metodo_pagamento && (
                  <div>
                    <label className="text-sm text-muted-foreground">Método de Pagamento</label>
                    <p className="font-medium capitalize">{session.metodo_pagamento}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Observações Iniciais */}
            {session.anotacoes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Observações Iniciais
                  </h3>
                  <div className="text-muted-foreground bg-muted/50 rounded p-3">
                    <TextPreview 
                      content={session.anotacoes}
                      title={`Observações - ${session.clients?.nome} - ${formatDateBR(session.data)}`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-4 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => onViewAgenda(session.id)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Ver na Agenda
          </Button>

          {session.status !== 'cancelada' && session.status !== 'realizada' && (
            <Button
              variant="outline"
              onClick={() => {
                onEdit(session)
                onOpenChange(false)
              }}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => {
              onAddNote(session)
              onOpenChange(false)
            }}
            className="flex items-center gap-2"
          >
            <StickyNote className="w-4 h-4" />
            Adicionar Lembrete
          </Button>

          {session.status === 'realizada' && session.valor && (
            <Button
              variant="outline"
              onClick={() => onViewPayment(session.id)}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Ver Pagamento
            </Button>
          )}

          {session.status === 'agendada' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onCancel(session.id)
                  onOpenChange(false)
                }}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onMarkNoShow(session.id)
                  onOpenChange(false)
                }}
                className="flex items-center gap-2 text-warning hover:text-warning"
              >
                <AlertTriangle className="w-4 h-4" />
                Marcar Falta
              </Button>
            </>
          )}
          
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(session.id)
              onOpenChange(false)
            }}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
