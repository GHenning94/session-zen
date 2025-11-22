import { Moon, Sun, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useUserTheme } from "@/hooks/useUserTheme"
import { useEffect, useState } from "react"

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const { saveThemePreference } = useUserTheme()
  const [isChanging, setIsChanging] = useState(false)

  const handleThemeToggle = async () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    const root = document.documentElement
    
    // Captura as cores computadas atuais antes de qualquer mudança
    const bodyStyle = window.getComputedStyle(document.body)
    const bgColor = bodyStyle.backgroundColor
    const fgColor = bodyStyle.color
    
    // Congela as cores do overlay para evitar piscada durante a transição
    root.style.setProperty('--transition-bg', bgColor)
    root.style.setProperty('--transition-fg', fgColor)
    
    // Ativa o overlay ANTES de trocar o tema
    root.classList.add('theme-transitioning')
    setIsChanging(true)

    // Troca o tema no próximo frame, garantindo que o overlay já está ativo
    requestAnimationFrame(() => {
      setTheme(newTheme)
      saveThemePreference(newTheme)

      // Remove o overlay depois que o novo tema foi aplicado
      setTimeout(() => {
        root.classList.remove('theme-transitioning')
        root.style.removeProperty('--transition-bg')
        root.style.removeProperty('--transition-fg')
        setIsChanging(false)
      }, 300)
    })
  }

  // Garante que o atributo data-theme acompanha o tema atual
  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleThemeToggle}
      disabled={isChanging}
      className="w-[180px] justify-start gap-2"
    >
      {isChanging ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </>
      )}
      <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
    </Button>
  )
}