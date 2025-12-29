import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit2, Trash2, Calendar, Clock } from "lucide-react"
import { formatDateBR, formatTimeBR } from "@/utils/formatters"
import DOMPurify from "dompurify"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useState } from "react"
import { ClientAvatar } from "./ClientAvatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SessionNote {
  id: string
  client_id: string
  session_id: string
  notes: string
  created_at: string
  clients?: {
    nome: string
    avatar_url?: string
  }
  sessions?: {
    data: string
    horario: string
    status: string
  }
}

interface SessionNoteViewModalProps {
  note: SessionNote | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (note: SessionNote) => void
  onDelete: (noteId: string) => void
}

export const SessionNoteViewModal = ({
  note,
  open,
  onOpenChange,
  onEdit,
  onDelete
}: SessionNoteViewModalProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!note) return null

  const sanitizedHtml = DOMPurify.sanitize(note.notes)

  const handleEdit = () => {
    // Just call onEdit - parent will handle modal state
    onEdit(note)
  }

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    onDelete(note.id)
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing through the X button or programmatically
    // This prevents the modal from being re-triggered by click events
    if (!newOpen) {
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} modal>
        <DialogContent 
          className="sm:max-w-[700px] max-h-[90vh]"
        >
          <DialogHeader className="pr-12">
            <div className="flex items-center gap-4">
              <ClientAvatar 
                avatarPath={note.clients?.avatar_url}
                clientName={note.clients?.nome || 'Cliente'}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl">
                  Anotação - {note.clients?.nome || 'Cliente'}
                </DialogTitle>
                {note.sessions && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateBR(note.sessions.data)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeBR(note.sessions.horario)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Action buttons below header */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleEdit}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/30 rounded-lg"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </ScrollArea>

          <div className="text-xs text-muted-foreground pt-4 border-t">
            Criado em {formatDateBR(note.created_at)} às {formatTimeBR(note.created_at)}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
