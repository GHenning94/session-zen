import { useState, useEffect, useRef, useCallback } from "react"
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
  const [displayedNotification, setDisplayedNotification] = useState<typeof notification>(null)
  const lastNotificationIdRef = useRef<string | null>(null)
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Memoize the callback to prevent useEffect re-runs
  const handleComplete = useCallback(() => {
    onAnimationComplete()
  }, [onAnimationComplete])
  
  useEffect(() => {
    // Debug: log when notification prop changes
    console.log('[NotificationToast] notification prop:', notification?.id, notification?.titulo)
    
    // Only trigger for NEW notifications (different id)
    if (!notification) {
      console.log('[NotificationToast] No notification, returning')
      return
    }
    
    if (notification.id === lastNotificationIdRef.current) {
      console.log('[NotificationToast] Same notification id, skipping:', notification.id)
      return
    }

    console.log('[NotificationToast] NEW notification detected:', notification.id, notification.titulo)
    
    // Clear any existing timers
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
    
    // Store this notification id as the last one we processed
    lastNotificationIdRef.current = notification.id
    
    // Play notification sound
    console.log('[NotificationToast] Playing sound')
    playNotificationSound()
    
    // Show the toast
    console.log('[NotificationToast] Setting visible = true')
    setDisplayedNotification(notification)
    setIsExiting(false)
    setIsVisible(true)

    // Start exit animation after 3 seconds
    exitTimerRef.current = setTimeout(() => {
      console.log('[NotificationToast] Starting exit animation')
      setIsExiting(true)
    }, 3000)

    // Complete animation after exit (3s visible + 0.5s exit)
    completeTimerRef.current = setTimeout(() => {
      console.log('[NotificationToast] Animation complete, calling handleComplete')
      setIsVisible(false)
      setIsExiting(false)
      setDisplayedNotification(null)
      handleComplete()
    }, 3500)

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
    }
  }, [notification?.id, handleComplete])

  console.log('[NotificationToast] Rendering toast, isVisible:', isVisible, 'displayedNotification:', displayedNotification?.id)

  // Don't render if not visible
  if (!isVisible || !displayedNotification) {
    return null
  }

  const category = getCategory(displayedNotification.titulo)
  const summary = getShortSummary(displayedNotification.conteudo)
  
  console.log('[NotificationToast] ACTUALLY RENDERING visible toast for:', displayedNotification.titulo)

  return (
    <div
      className={cn(
        // Fixed position at top right, to the LEFT of the bell icon area
        "fixed top-4 right-20 z-[100]",
        "whitespace-nowrap pointer-events-none",
        "transition-all duration-500 ease-out",
        // Entry animation - slides in from the right
        !isExiting && "animate-in fade-in slide-in-from-right-4",
        // Exit animation - slides right into the bell icon
        isExiting && "animate-out fade-out slide-out-to-right-8 duration-500"
      )}
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
