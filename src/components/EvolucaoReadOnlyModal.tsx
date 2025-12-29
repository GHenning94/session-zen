import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import { formatDateBR, formatTimeBR } from "@/utils/formatters"
import DOMPurify from "dompurify"
import { ClientAvatar } from "./ClientAvatar"
import { getSessionStatusColor, getSessionStatusLabel } from "@/utils/sessionStatusUtils"

interface Evolucao {
  id: string
  client_id: string
  session_id?: string
  data_sessao: string
  evolucao: string
  created_at: string
  session?: {
    id: string
    data: string
    horario: string
    status: string
  }
}

interface EvolucaoReadOnlyModalProps {
  evolucao: Evolucao | null
  clientName: string
  clientAvatar?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EvolucaoReadOnlyModal = ({
  evolucao,
  clientName,
  clientAvatar,
  open,
  onOpenChange
}: EvolucaoReadOnlyModalProps) => {
  if (!evolucao) return null

  const sanitizedHtml = DOMPurify.sanitize(evolucao.evolucao)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader className="pr-12">
          <div className="flex items-center gap-4">
            <ClientAvatar 
              avatarPath={clientAvatar}
              clientName={clientName}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">
                Evolução - {clientName}
              </DialogTitle>
              {evolucao.session && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDateBR(evolucao.session.data)} às {formatTimeBR(evolucao.session.horario)}
                  </Badge>
                  <Badge variant={getSessionStatusColor(evolucao.session.status) as any} className="text-xs">
                    {getSessionStatusLabel(evolucao.session.status)}
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
          Criado em {formatDateBR(evolucao.created_at)} às {formatTimeBR(evolucao.created_at)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
