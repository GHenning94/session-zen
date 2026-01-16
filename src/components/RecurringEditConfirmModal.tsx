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
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary shrink-0" />
            <span>Editar Sessão Recorrente</span>
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
          <button
            type="button"
            className="w-full p-4 border border-border rounded-lg flex items-start gap-3 text-left hover:bg-accent transition-colors"
            onClick={() => handleChoice('this_only')}
          >
            <User className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-medium text-foreground">Alterar apenas esta</span>
              <span className="text-xs text-muted-foreground">
                A sessão será desvinculada da recorrência e se tornará uma sessão individual.
              </span>
            </div>
          </button>
          
          <button
            type="button"
            className="w-full p-4 border border-border rounded-lg flex items-start gap-3 text-left hover:bg-accent transition-colors"
            onClick={() => handleChoice('all_future')}
          >
            <Repeat className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-medium text-foreground">Alterar todas futuras</span>
              <span className="text-xs text-muted-foreground">
                Aplica as alterações a esta sessão e todas as sessões futuras da série.
              </span>
            </div>
          </button>
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
