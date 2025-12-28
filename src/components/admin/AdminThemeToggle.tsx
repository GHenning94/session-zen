import { Moon, Sun, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAdminTheme } from "@/hooks/useAdminTheme"

export const AdminThemeToggle = () => {
  const { theme, toggleTheme } = useAdminTheme()
  const [isChanging, setIsChanging] = useState(false)

  const handleThemeToggle = () => {
    const root = document.documentElement
    
    // Capture current colors before change
    const bodyStyle = window.getComputedStyle(document.body)
    const bgColor = bodyStyle.backgroundColor
    const fgColor = bodyStyle.color
    
    // Freeze overlay colors
    root.style.setProperty('--transition-bg', bgColor)
    root.style.setProperty('--transition-fg', fgColor)
    
    // Activate overlay
    root.classList.add('theme-transitioning')
    setIsChanging(true)

    requestAnimationFrame(() => {
      toggleTheme()

      setTimeout(() => {
        root.classList.remove('theme-transitioning')
        root.style.removeProperty('--transition-bg')
        root.style.removeProperty('--transition-fg')
        setIsChanging(false)
      }, 300)
    })
  }

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleThemeToggle}
      disabled={isChanging}
      className="w-full sm:w-[200px] h-10 justify-start gap-2"
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
