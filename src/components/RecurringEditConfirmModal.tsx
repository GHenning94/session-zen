import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Repeat, User } from "lucide-react"

export type RecurringEditChoice = 'this_only' | 'all_future'

interface RecurringEditConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (choice: RecurringEditChoice) => void
  sessionDate?: string
}

export const RecurringEditConfirmModal = ({
  open,
  onOpenChange,
  onConfirm,
  sessionDate
}: RecurringEditConfirmModalProps) => {
  const handleChoice = (choice: RecurringEditChoice) => {
    onConfirm(choice)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Editar Sessão Recorrente
          </DialogTitle>
          <DialogDescription className="pt-2">
            {sessionDate && (
              <span className="text-sm text-muted-foreground block mb-2">
                Sessão de {new Date(sessionDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long'
                })}
              </span>
            )}
            Esta sessão faz parte de uma série recorrente. Como você deseja aplicar as alterações?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex items-start gap-3 text-left hover:bg-accent justify-start"
            onClick={() => handleChoice('this_only')}
          >
            <User className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">Alterar apenas esta</span>
              <span className="text-xs text-muted-foreground font-normal">
                A sessão será desvinculada da recorrência e se tornará uma sessão individual.
              </span>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex items-start gap-3 text-left hover:bg-accent justify-start"
            onClick={() => handleChoice('all_future')}
          >
            <Repeat className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">Alterar todas futuras</span>
              <span className="text-xs text-muted-foreground font-normal">
                Aplica as alterações a esta sessão e todas as sessões futuras da série.
              </span>
            </div>
          </Button>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
