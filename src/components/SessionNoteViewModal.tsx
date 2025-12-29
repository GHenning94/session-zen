import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit2, Trash2, Calendar, Clock, User } from "lucide-react"
import { formatDateBR, formatTimeBR } from "@/utils/formatters"
import DOMPurify from "dompurify"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useState } from "react"

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
    onEdit(note)
    onOpenChange(false)
  }

  const handleDeleteConfirm = () => {
    onDelete(note.id)
    setShowDeleteConfirm(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5" />
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-1.5"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] mt-4">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/30 rounded-lg"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </ScrollArea>

          <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
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
