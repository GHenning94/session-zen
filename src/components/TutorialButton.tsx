import { Button } from "@/components/ui/button"
import { PlayCircle } from "lucide-react"

interface TutorialButtonProps {
  onClick: () => void
}

export const TutorialButton = ({ onClick }: TutorialButtonProps) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-xl animate-gradient-border" />
      <Button 
        onClick={onClick}
        className="relative z-10 bg-transparent text-foreground border-0 hover:bg-transparent m-[3px]"
      >
        <div className="bg-background px-4 py-2 rounded-lg flex items-center">
          <PlayCircle className="w-4 h-4 mr-2" />
          Tutorial
        </div>
      </Button>
    </div>
  )
}
