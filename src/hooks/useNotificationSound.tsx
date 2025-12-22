import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'notification_sound_enabled'

export const useNotificationSound = () => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    // Default to true, check localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === null ? true : stored === 'true'
    }
    return true
  })

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(soundEnabled))
  }, [soundEnabled])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create oscillator for the main tone
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Pleasant notification frequency (C6 note ~1047 Hz)
      oscillator.frequency.setValueAtTime(1047, audioContext.currentTime)
      oscillator.type = 'sine'
      
      // Quick fade in and out for a gentle "ding"
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
      
      // Play a second harmonic note slightly after for richness
      const oscillator2 = audioContext.createOscillator()
      const gainNode2 = audioContext.createGain()
      
      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.destination)
      
      // E6 note ~1319 Hz (major third above)
      oscillator2.frequency.setValueAtTime(1319, audioContext.currentTime + 0.05)
      oscillator2.type = 'sine'
      
      gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.05)
      gainNode2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.07)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35)
      
      oscillator2.start(audioContext.currentTime + 0.05)
      oscillator2.stop(audioContext.currentTime + 0.35)
      
      // Clean up
      setTimeout(() => {
        audioContext.close()
      }, 500)
    } catch (error) {
      console.log('[useNotificationSound] Could not play sound:', error)
    }
  }, [soundEnabled])

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    playSound
  }
}

// Global singleton for the sound setting
let globalSoundEnabled = typeof window !== 'undefined' 
  ? localStorage.getItem(STORAGE_KEY) !== 'false'
  : true

export const getNotificationSoundEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    globalSoundEnabled = stored === null ? true : stored === 'true'
  }
  return globalSoundEnabled
}

export const playNotificationSound = () => {
  if (!getNotificationSoundEnabled()) return

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(1047, audioContext.currentTime)
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
    
    const oscillator2 = audioContext.createOscillator()
    const gainNode2 = audioContext.createGain()
    
    oscillator2.connect(gainNode2)
    gainNode2.connect(audioContext.destination)
    
    oscillator2.frequency.setValueAtTime(1319, audioContext.currentTime + 0.05)
    oscillator2.type = 'sine'
    
    gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.05)
    gainNode2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.07)
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35)
    
    oscillator2.start(audioContext.currentTime + 0.05)
    oscillator2.stop(audioContext.currentTime + 0.35)
    
    setTimeout(() => {
      audioContext.close()
    }, 500)
  } catch (error) {
    console.log('[playNotificationSound] Could not play sound:', error)
  }
}
