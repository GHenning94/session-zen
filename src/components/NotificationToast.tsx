import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowUpRight, Bell } from "lucide-react"
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
  if (lowerTitle.includes('aniversário')) return 'Aniversário'
  if (lowerTitle.includes('meta')) return 'Meta'
  if (lowerTitle.includes('pagamento')) return 'Pagamento'
  if (lowerTitle.includes('sessão') || lowerTitle.includes('agendamento')) return 'Sessão'
  if (lowerTitle.includes('cliente') || lowerTitle.includes('paciente')) return 'Cliente'
  if (lowerTitle.includes('pacote')) return 'Pacote'
  if (lowerTitle.includes('lembrete')) return 'Lembrete'
  return 'Aviso'
}

// Helper to get short summary from content
const getShortSummary = (conteudo: string): string => {
  // Remove special tags and markdown links completely
  const clean = conteudo
    .replace(/\s*\[SESSION_ID:[^\]]+\]/, '')
    .replace(/\s*\[REDIRECT:[^\]]+\]/, '')
    .replace(/\s*\[PACKAGE_EDIT:[^\]]+\]/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '') // Remove markdown links completely
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
    
    // Sound is now played in NotificationContext when notification is enqueued
    // This ensures sound plays even in background tabs
    
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
        // Fixed position - more to the left and lower
        "fixed top-16 right-36 z-[100]",
        "whitespace-nowrap pointer-events-none",
        // Entry animation - slides in from the right
        !isExiting && "animate-in fade-in slide-in-from-right-4 duration-300",
        // Exit animation - slides right into the bell icon with no flicker
        isExiting && "animate-out fade-out slide-out-to-right-8 duration-300 fill-mode-forwards"
      )}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground rounded-full py-2 px-4 shadow-xl shadow-primary/25 backdrop-blur-md border border-primary-foreground/10">
        {/* Bell icon */}
        <Bell className="h-4 w-4 text-primary-foreground flex-shrink-0" />
        
        {/* Category badge - high contrast */}
        <span className="text-xs font-bold text-primary-foreground bg-background/30 px-2.5 py-0.5 rounded-full">
          {category}
        </span>
        
        {/* Summary text */}
        <span className="text-sm text-primary-foreground font-medium max-w-[220px] truncate">
          {summary}
        </span>
        
        {/* Arrow icon */}
        <ArrowUpRight className="h-4 w-4 text-primary-foreground/80 flex-shrink-0" />
      </div>
    </div>
  )
}
