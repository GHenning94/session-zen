import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  History, Undo2, Download, Copy, ArrowLeftRight, 
  EyeOff, Calendar, Clock, Trash2 
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export interface ActionHistoryItem {
  id: string
  type: 'import' | 'copy' | 'mirror' | 'ignore' | 'send'
  eventId: string
  eventTitle: string
  eventDate: string
  timestamp: Date
  canUndo: boolean
  undoData?: any
}

interface ActionHistoryPanelProps {
  history: ActionHistoryItem[]
  onUndo: (item: ActionHistoryItem) => Promise<boolean>
  onClearHistory: () => void
}

const actionLabels: Record<string, { label: string; icon: any; color: string }> = {
  import: { label: 'Importado', icon: Download, color: 'text-primary' },
  copy: { label: 'Copiado', icon: Copy, color: 'text-success' },
  mirror: { label: 'Espelhado', icon: ArrowLeftRight, color: 'text-info' },
  ignore: { label: 'Ignorado', icon: EyeOff, color: 'text-muted-foreground' },
  send: { label: 'Enviado', icon: Download, color: 'text-warning' },
}

export function ActionHistoryPanel({ history, onUndo, onClearHistory }: ActionHistoryPanelProps) {
  const { toast } = useToast()
  const [undoing, setUndoing] = useState<string | null>(null)

  const handleUndo = async (item: ActionHistoryItem) => {
    if (!item.canUndo) {
      toast({
        title: "Não é possível desfazer",
        description: "Esta ação não pode mais ser desfeita.",
        variant: "destructive"
      })
      return
    }

    setUndoing(item.id)
    try {
      const success = await onUndo(item)
      if (success) {
        toast({
          title: "Ação desfeita!",
          description: `"${item.eventTitle}" foi restaurado.`,
        })
      }
    } catch (error) {
      toast({
        title: "Erro ao desfazer",
        description: "Não foi possível reverter a ação.",
        variant: "destructive"
      })
    } finally {
      setUndoing(null)
    }
  }

  if (history.length === 0) {
    return (
      <Card className="shadow-soft border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            Histórico de Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma ação registrada ainda.</p>
            <p className="text-xs mt-1">As ações realizadas aparecerão aqui para você poder desfazê-las se necessário.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-soft border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            Histórico de Ações
            <Badge variant="outline" className="ml-2">{history.length}</Badge>
          </CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá todas as ações do histórico. Você não poderá mais desfazer as ações anteriores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onClearHistory}>Limpar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {history.map((item) => {
              const action = actionLabels[item.type]
              const ActionIcon = action.icon

              return (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <ActionIcon className={`w-4 h-4 ${action.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.eventTitle}</span>
                        <Badge variant="outline" className="text-xs">
                          {action.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{item.eventDate}</span>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{format(item.timestamp, "HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUndo(item)}
                    disabled={!item.canUndo || undoing === item.id}
                    className={!item.canUndo ? "opacity-50" : ""}
                  >
                    <Undo2 className={`w-4 h-4 mr-1 ${undoing === item.id ? 'animate-spin' : ''}`} />
                    Desfazer
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
