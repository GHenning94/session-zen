import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "session-zen-sidebar-auto-hide"
const CHANGE_EVENT = "session-zen-sidebar-auto-hide-change"

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function useSidebarAutoHide() {
  const [enabled, setEnabledState] = useState<boolean>(() =>
    typeof window === "undefined" ? false : readStored()
  )

  useEffect(() => {
    const sync = () => setEnabledState(readStored())
    window.addEventListener("storage", sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* ignore */
    }
    setEnabledState(value)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { enabled, setEnabled }
}
