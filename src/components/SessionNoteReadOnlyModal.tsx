import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import { formatDateBR, formatTimeBR } from "@/utils/formatters"
import DOMPurify from "dompurify"
import { ClientAvatar } from "./ClientAvatar"
import { getSessionStatusColor, getSessionStatusLabel } from "@/utils/sessionStatusUtils"

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

interface SessionNoteReadOnlyModalProps {
  note: SessionNote | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SessionNoteReadOnlyModal = ({
  note,
  open,
  onOpenChange
}: SessionNoteReadOnlyModalProps) => {
  if (!note) return null

  const sanitizedHtml = DOMPurify.sanitize(note.notes)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
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
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDateBR(note.sessions.data)} às {formatTimeBR(note.sessions.horario)}
                  </Badge>
                  <Badge variant={getSessionStatusColor(note.sessions.status) as any} className="text-xs">
                    {getSessionStatusLabel(note.sessions.status)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

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
  )
}
