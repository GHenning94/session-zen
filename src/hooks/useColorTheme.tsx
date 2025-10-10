import { useLayoutEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const DEFAULT_COLOR = '217 91% 45%' // Azul profissional padrão

// Helper functions for color conversion
const hexToHsl = (hex: string): string => {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  l = Math.round(l * 100)
  
  return `${h} ${s}% ${l}%`
}

const rgbToHsl = (rgb: string): string => {
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return DEFAULT_COLOR
  
  const r = parseInt(match[0]) / 255
  const g = parseInt(match[1]) / 255
  const b = parseInt(match[2]) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  l = Math.round(l * 100)
  
  return `${h} ${s}% ${l}%`
}

// Normalize any color format to HSL triplet "H S% L%"
const normalizeToHslTriplet = (value: string): string => {
  if (!value) return DEFAULT_COLOR
  
  const trimmed = value.trim()
  
  // Already in HSL triplet format "H S% L%"
  if (/^\d+\s+\d+%\s+\d+%$/.test(trimmed)) {
    return trimmed
  }
  
  // HEX format
  if (trimmed.startsWith('#')) {
    return hexToHsl(trimmed)
  }
  
  // RGB format
  if (trimmed.startsWith('rgb')) {
    return rgbToHsl(trimmed)
  }
  
  // HSL function format "hsl(H, S%, L%)"
  const hslMatch = trimmed.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`
  }
  
  // Try to extract numbers and percentages
  const numbers = trimmed.match(/\d+/g)
  if (numbers && numbers.length >= 3) {
    return `${numbers[0]} ${numbers[1]}% ${numbers[2]}%`
  }
  
  console.warn('Could not normalize color:', value, '- using default')
  return DEFAULT_COLOR
}

export const useColorTheme = () => {
  const { user } = useAuth()
  const location = useLocation()

  // Direct color application without guards (for internal use)
  const directApplyColor = useCallback((colorValue: string) => {
    // Normalize to HSL triplet format
    const normalizedColor = normalizeToHslTriplet(colorValue)
    const cleanColor = normalizedColor.replace(/[^\d\s%]/g, '').trim()
    
    // Update CSS custom properties
    document.documentElement.style.setProperty('--primary', cleanColor)
    document.documentElement.style.setProperty('--sidebar-primary', cleanColor)
    
    // Create variations
    const hslValues = cleanColor.match(/\d+/g)
    if (hslValues && hslValues.length >= 3) {
      const [h, s, l] = hslValues
      const lighterL = Math.min(85, parseInt(l) + 15)
      const darkerL = Math.max(25, parseInt(l) - 10)
      
      document.documentElement.style.setProperty('--primary-glow', `${h} ${s}% ${lighterL}%`)
      
      const gradient = `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${h} ${s}% ${darkerL}%))`
      document.documentElement.style.setProperty('--gradient-primary', gradient)
    }
  }, [])

  const applyBrandColor = useCallback((colorValue: string) => {
    // Don't apply custom colors on landing page
    if (location.pathname === '/') {
      return
    }
    directApplyColor(colorValue)
  }, [location.pathname, directApplyColor])

  const resetToDefaultColors = useCallback(() => {
    // Reset to default blue for landing page
    directApplyColor(DEFAULT_COLOR)
  }, [directApplyColor])

  const saveBrandColor = async (colorValue: string) => {
    if (!user) return false

    try {
      // Always normalize and save as HSL triplet
      const normalized = normalizeToHslTriplet(colorValue)
      
      const { error } = await supabase
        .from('configuracoes')
        .update({ brand_color: normalized })
        .eq('user_id', user.id)

      if (error) throw error

      applyBrandColor(normalized)
      toast.success('Cor da plataforma atualizada com sucesso!')
      return true
    } catch (error) {
      console.error('Error saving user color:', error)
      toast.error('Erro ao salvar cor da plataforma')
      return false
    }
  }

  useLayoutEffect(() => {
    // CRITICAL: Apply default colors IMMEDIATELY and SYNCHRONOUSLY
    // This ensures colors are always present, even for new accounts
    if (location.pathname !== '/') {
      directApplyColor(DEFAULT_COLOR)
    }
    
    const loadUserColor = async () => {
      // If on landing page, always reset to default and don't apply any custom color
      if (location.pathname === '/') {
        resetToDefaultColors()
        return
      }

      if (!user) {
        // For non-logged users not on landing page, default already applied above
        return
      }

      try {
        // Then load user's custom color if they have one
        const { data } = await supabase
          .from('configuracoes')
          .select('brand_color')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data?.brand_color) {
          // Normalize before applying to ensure consistent format
          const normalized = normalizeToHslTriplet(data.brand_color)
          applyBrandColor(normalized)
        }
        // If no custom color, keep the default that was already applied
      } catch (error) {
        console.error('Error loading user color:', error)
        // Default is already applied, so no need to do anything
      }
    }

    loadUserColor()
  }, [user, applyBrandColor, resetToDefaultColors, location.pathname, directApplyColor])

  return { applyBrandColor, saveBrandColor, resetToDefaultColors }
}