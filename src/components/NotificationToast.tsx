import { useState, useEffect, useRef } from "react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { playNotificationSound } from "@/hooks/useNotificationSound"

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
  const [currentNotification, setCurrentNotification] = useState<typeof notification>(null)
  const onCompleteRef = useRef(onAnimationComplete)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Keep the callback ref updated
  onCompleteRef.current = onAnimationComplete

  useEffect(() => {
    // Clear any existing timers
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current)
      completeTimerRef.current = null
    }

    // Check if we have a new notification
    if (notification) {
      const isNew = !currentNotification || notification.id !== currentNotification.id
      
      console.log('[NotificationToast] Notification received:', {
        notificationId: notification.id,
        currentId: currentNotification?.id,
        isNew
      })

      if (isNew) {
        console.log('[NotificationToast] Showing toast for:', notification.titulo)
        
        // Play notification sound
        playNotificationSound()
        
        // Set the new notification and show it
        setCurrentNotification(notification)
        setIsExiting(false)
        setIsVisible(true)

        // Start exit animation after 3 seconds
        exitTimerRef.current = setTimeout(() => {
          console.log('[NotificationToast] Starting exit animation')
          setIsExiting(true)
        }, 3000)

        // Complete animation after exit (3s visible + 0.5s exit)
        completeTimerRef.current = setTimeout(() => {
          console.log('[NotificationToast] Animation complete, hiding toast')
          setIsVisible(false)
          setIsExiting(false)
          setCurrentNotification(null)
          onCompleteRef.current()
        }, 3500)
      }
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current)
      }
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current)
      }
    }
  }, [notification]) // Depend on the entire notification object

  // Don't render if not visible or no notification to show
  if (!isVisible || !currentNotification) {
    return null
  }

  const category = getCategory(currentNotification.titulo)
  const summary = getShortSummary(currentNotification.conteudo)

  return (
    <div
      className={cn(
        "absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50",
        "whitespace-nowrap pointer-events-none",
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
