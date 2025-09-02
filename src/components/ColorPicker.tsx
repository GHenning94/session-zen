import { useState } from "react"
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
import { Check } from "lucide-react"

const COLOR_PALETTE = [
  { name: "Azul Profissional", value: "217 91% 45%", color: "hsl(217, 91%, 45%)" },
  { name: "Verde Saúde", value: "142 71% 45%", color: "hsl(142, 71%, 45%)" },
  { name: "Roxo Elegante", value: "262 83% 58%", color: "hsl(262, 83%, 58%)" },
  { name: "Vermelho Energia", value: "0 84% 60%", color: "hsl(0, 84%, 60%)" },
  { name: "Laranja Criativo", value: "24 95% 53%", color: "hsl(24, 95%, 53%)" },
  { name: "Rosa Moderno", value: "330 81% 60%", color: "hsl(330, 81%, 60%)" },
  { name: "Teal Calmo", value: "173 58% 39%", color: "hsl(173, 58%, 39%)" },
  { name: "Índigo Profundo", value: "243 75% 59%", color: "hsl(243, 75%, 59%)" },
]

const GRADIENT_PALETTE = [
  { name: "Azul Oceano", value: "217 91% 45%", gradient: "linear-gradient(135deg, hsl(217, 91%, 45%), hsl(200, 95%, 60%))" },
  { name: "Verde Natureza", value: "142 71% 45%", gradient: "linear-gradient(135deg, hsl(142, 71%, 45%), hsl(120, 75%, 55%))" },
  { name: "Roxo Místico", value: "262 83% 58%", gradient: "linear-gradient(135deg, hsl(262, 83%, 58%), hsl(280, 85%, 65%))" },
  { name: "Por do Sol", value: "24 95% 53%", gradient: "linear-gradient(135deg, hsl(24, 95%, 53%), hsl(45, 95%, 60%))" },
]

interface ColorPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentColor: string
  onSelectColor: (colorValue: string, colorName: string) => void
}

export const ColorPicker = ({
  open,
  onOpenChange,
  currentColor,
  onSelectColor
}: ColorPickerProps) => {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [selectedColorName, setSelectedColorName] = useState("")

  const handleColorSelect = (colorValue: string, colorName: string) => {
    setSelectedColor(colorValue)
    setSelectedColorName(colorName)
  }

  const handleConfirm = () => {
    if (selectedColor) {
      onSelectColor(selectedColor, selectedColorName)
      onOpenChange(false)
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
            <div className="grid grid-cols-4 gap-3">
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

          <div>
            <Label className="text-sm font-medium mb-3 block">Gradientes</Label>
            <div className="grid grid-cols-4 gap-3">
              {GRADIENT_PALETTE.map((gradient) => (
                <button
                  key={gradient.value}
                  className="relative w-16 h-16 rounded-lg border-2 border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ background: gradient.gradient }}
                  onClick={() => handleColorSelect(gradient.value, gradient.name)}
                  title={gradient.name}
                >
                  {selectedColor === gradient.value && (
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedColor}>
            Aplicar Cor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}