import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Loader2 } from "lucide-react"

const COLOR_PALETTE = [
  { name: "Azul Profissional", value: "217 91% 45%", color: "hsl(217 91% 45%)" },
  { name: "Azul Céu", value: "200 98% 39%", color: "hsl(200 98% 39%)" },
  { name: "Roxo Escuro", value: "271 91% 45%", color: "hsl(271 91% 45%)" },
  { name: "Roxo Claro", value: "271 91% 65%", color: "hsl(271 91% 65%)" },
  { name: "Laranja Escuro", value: "20 91% 48%", color: "hsl(20 91% 48%)" },
  { name: "Laranja Claro", value: "33 96% 56%", color: "hsl(33 96% 56%)" },
]


interface ColorPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentColor: string
  onSaveColor: (colorValue: string) => Promise<boolean>
}

export const ColorPicker = ({
  open,
  onOpenChange,
  currentColor,
  onSaveColor
}: ColorPickerProps) => {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [selectedColorName, setSelectedColorName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Update selected color when modal opens or currentColor changes
  useEffect(() => {
    if (open) {
      setSelectedColor(currentColor)
      // Find the name of the current color
      const currentColorObj = COLOR_PALETTE.find(color => color.value === currentColor)
      setSelectedColorName(currentColorObj?.name || "")
    }
  }, [open, currentColor])

  const handleColorSelect = (colorValue: string, colorName: string) => {
    setSelectedColor(colorValue)
    setSelectedColorName(colorName)
  }

  const handleSave = async () => {
    if (selectedColor && !isSaving) {
      setIsSaving(true)
      const success = await onSaveColor(selectedColor)
      setIsSaving(false)
      
      if (success) {
        onOpenChange(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Escolher Cor da Plataforma</DialogTitle>
          <DialogDescription>
            Selecione uma cor para personalizar a aparência da plataforma.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Cores Sólidas</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color.value}
                  className="relative w-16 h-16 rounded-lg border-2 border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ backgroundColor: color.color }}
                  onClick={() => handleColorSelect(color.value, color.name)}
                  title={color.name}
                >
                  {selectedColor === color.value && (
                    <Check className="absolute inset-0 m-auto w-6 h-6 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>


          {selectedColorName && (
            <div className="text-sm text-muted-foreground">
              Cor selecionada: <span className="font-medium">{selectedColorName}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedColor || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}