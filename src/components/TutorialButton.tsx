import { Button } from "@/components/ui/button"
import { PlayCircle } from "lucide-react"

interface TutorialButtonProps {
  onClick: () => void
}

export const TutorialButton = ({ onClick }: TutorialButtonProps) => {
  return (
    <Button onClick={onClick} variant="default">
      <PlayCircle />
      Tutorial
    </Button>
  )
}
