import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TutorialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoUrl?: string
}

export const TutorialModal = ({ open, onOpenChange, videoUrl }: TutorialModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Tutorial da Plataforma</DialogTitle>
          <DialogDescription>
            Aprenda a usar todos os recursos da plataforma
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full aspect-video">
          {videoUrl ? (
            <iframe
              className="w-full h-full rounded-b-lg"
              src={videoUrl}
              title="Tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted rounded-b-lg">
              <p className="text-muted-foreground">URL do vídeo será adicionada em breve</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
