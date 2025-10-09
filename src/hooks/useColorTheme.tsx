import { useLayoutEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const DEFAULT_COLOR = '217 91% 45%' // Azul profissional padrão

export const useColorTheme = () => {
  const { user } = useAuth()
  const location = useLocation()

  // Direct color application without guards (for internal use)
  const directApplyColor = useCallback((colorValue: string) => {
    // Ensure we're working with HSL format
    const cleanColor = colorValue.replace(/[^\d\s%]/g, '').trim()
    
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
      const { error } = await supabase
        .from('configuracoes')
        .update({ brand_color: colorValue })
        .eq('user_id', user.id)

      if (error) throw error

      applyBrandColor(colorValue)
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
          applyBrandColor(data.brand_color)
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