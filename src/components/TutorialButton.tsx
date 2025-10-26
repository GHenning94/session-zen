import { Button } from "@/components/ui/button"
import { PlayCircle } from "lucide-react"

interface TutorialButtonProps {
  onClick: () => void
}

export const TutorialButton = ({ onClick }: TutorialButtonProps) => {
  return (
    <div className="relative">
      <Button 
        onClick={onClick}
        className="relative z-10 bg-background text-foreground border-0 hover:bg-background"
      >
        <PlayCircle className="w-4 h-4 mr-2" />
        Tutorial
      </Button>
      <div className="absolute inset-0 rounded-xl animate-gradient-border" />
    </div>
  )
}
