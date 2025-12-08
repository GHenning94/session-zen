import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const PREDEFINED_PROFESSIONS = [
  "Psicólogo",
  "Psicanalista", 
  "Terapeuta",
  "Neurologista",
  "Psicoterapeuta",
  "Terapeuta Familiar",
  "Terapeuta de Casal",
  "Coach",
  "Outros"
]

interface ProfessionSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProfession: string
  onSelectProfession: (profession: string) => void
}

export const ProfessionSelector = ({
  open,
  onOpenChange,
  currentProfession,
  onSelectProfession
}: ProfessionSelectorProps) => {
  const [selectedProfession, setSelectedProfession] = useState(currentProfession)
  const [customProfession, setCustomProfession] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleProfessionClick = (profession: string) => {
    if (profession === "Outros") {
      setShowCustomInput(true)
      setSelectedProfession("")
    } else {
      setSelectedProfession(profession)
      setShowCustomInput(false)
      setCustomProfession("")
    }
  }

  const handleConfirm = () => {
    const finalProfession = showCustomInput ? customProfession : selectedProfession
    if (finalProfession.trim()) {
      onSelectProfession(finalProfession.trim())
      onOpenChange(false)
      setShowCustomInput(false)
      setCustomProfession("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Selecionar Profissão</DialogTitle>
          <DialogDescription>
            Escolha sua profissão ou digite uma personalizada.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_PROFESSIONS.map((profession) => (
              <Badge
                key={profession}
                variant={selectedProfession === profession ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleProfessionClick(profession)}
              >
                {profession}
              </Badge>
            ))}
          </div>

          {showCustomInput && (
            <div className="space-y-2">
              <Label htmlFor="custom-profession">Digite sua profissão:</Label>
              <Input
                id="custom-profession"
                value={customProfession}
                onChange={(e) => setCustomProfession(e.target.value)}
                placeholder="Ex: Terapeuta Ocupacional"
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProfession && !customProfession}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}