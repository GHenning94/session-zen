import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationToastProps {
  notification: {
    id: string
    titulo: string
    conteudo: string
  } | null
  onAnimationComplete: () => void
}

// Helper to get category from notification title
const getCategory = (titulo: string): string => {
  const lowerTitle = titulo.toLowerCase()
  if (lowerTitle.includes('pagamento')) return 'Pagamento'
  if (lowerTitle.includes('sessão') || lowerTitle.includes('agendamento')) return 'Sessão'
  if (lowerTitle.includes('cliente')) return 'Cliente'
  if (lowerTitle.includes('pacote')) return 'Pacote'
  if (lowerTitle.includes('lembrete')) return 'Lembrete'
  return 'Aviso'
}

// Helper to get short summary from content
const getShortSummary = (conteudo: string): string => {
  // Remove special tags
  const clean = conteudo
    .replace(/\s*\[SESSION_ID:[^\]]+\]/, '')
    .replace(/\s*\[REDIRECT:[^\]]+\]/, '')
    .replace(/\s*\[PACKAGE_EDIT:[^\]]+\]/, '')
    .trim()
  
  // Return first ~40 chars
  if (clean.length > 45) {
    return clean.slice(0, 42) + '...'
  }
  return clean
}

export const NotificationToast = ({ notification, onAnimationComplete }: NotificationToastProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (notification) {
      // Reset states
      setIsExiting(false)
      
      // Small delay before showing (for smooth entrance)
      const showTimer = setTimeout(() => {
        setIsVisible(true)
      }, 50)

      // Start exit animation after 3 seconds
      const exitTimer = setTimeout(() => {
        setIsExiting(true)
      }, 3000)

      // Complete animation after exit
      const completeTimer = setTimeout(() => {
        setIsVisible(false)
        setIsExiting(false)
        onAnimationComplete()
      }, 3500) // 3s visible + 0.5s exit animation

      return () => {
        clearTimeout(showTimer)
        clearTimeout(exitTimer)
        clearTimeout(completeTimer)
      }
    } else {
      setIsVisible(false)
      setIsExiting(false)
    }
  }, [notification, onAnimationComplete])

  if (!notification || !isVisible) return null

  const category = getCategory(notification.titulo)
  const summary = getShortSummary(notification.conteudo)

  return (
    <div
      className={cn(
        "absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50",
        "whitespace-nowrap",
        "transition-all duration-500 ease-out",
        // Entry animation
        !isExiting && "animate-in fade-in slide-in-from-right-4",
        // Exit animation - slides right into the bell icon
        isExiting && "animate-out fade-out slide-out-to-right-8 duration-500"
      )}
      style={{
        transformOrigin: 'right center'
      }}
    >
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-full py-1.5 px-3 shadow-lg">
        {/* Category badge */}
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
          {category}
        </span>
        
        {/* Summary text */}
        <span className="text-sm text-amber-800 dark:text-amber-200 font-medium max-w-[200px] truncate">
          {summary}
        </span>
        
        {/* Arrow icon */}
        <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      </div>
    </div>
  )
}
