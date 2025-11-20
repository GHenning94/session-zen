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
    setIsChanging(true)
    const newTheme = theme === "dark" ? "light" : "dark"
    
    // Aplica o tema imediatamente no DOM para evitar flash
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    
    setTheme(newTheme)
    await saveThemePreference(newTheme)
    
    // Pequeno delay para smooth transition
    setTimeout(() => setIsChanging(false), 300)
  }

  // Garante sincronização entre next-themes e DOM
  useEffect(() => {
    if (theme) {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleThemeToggle}
      disabled={isChanging}
      className="w-full justify-start gap-2"
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