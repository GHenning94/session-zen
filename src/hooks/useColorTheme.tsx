import { useLayoutEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const DEFAULT_COLOR = '217 91% 45%' // Azul profissional padrão

export const useColorTheme = () => {
  const { user } = useAuth()
  const location = useLocation()

  const applyBrandColor = useCallback((colorValue: string) => {
    // Only apply colors if user is logged in and not on landing page
    if (!user || location.pathname === '/') {
      return
    }

    // Ensure we're working with HSL format
    const cleanColor = colorValue.replace(/[^\d\s%]/g, '').trim()
    
    // Update CSS custom properties
    document.documentElement.style.setProperty('--primary', cleanColor)
    document.documentElement.style.setProperty('--sidebar-primary', cleanColor)
    document.documentElement.style.setProperty('--ring', cleanColor)
    document.documentElement.style.setProperty('--sidebar-ring', cleanColor)
    
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
  }, [user, location.pathname])

  const resetToDefaultColors = useCallback(() => {
    // Reset to default blue for landing page
    document.documentElement.style.setProperty('--primary', DEFAULT_COLOR)
    document.documentElement.style.setProperty('--sidebar-primary', DEFAULT_COLOR)
    document.documentElement.style.setProperty('--ring', DEFAULT_COLOR)
    document.documentElement.style.setProperty('--sidebar-ring', DEFAULT_COLOR)
    document.documentElement.style.setProperty('--primary-glow', '217 91% 60%')
    document.documentElement.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(217 91% 45%), hsl(217 91% 35%))')
  }, [])

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
    const loadUserColor = async () => {
      // If on landing page, always reset to default and don't apply any custom color
      if (location.pathname === '/') {
        resetToDefaultColors()
        return
      }

      if (!user) {
        // For non-logged users not on landing page, apply default color
        applyBrandColor(DEFAULT_COLOR)
        return
      }

      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('brand_color')
          .eq('user_id', user.id)
          .maybeSingle()

        const colorToApply = data?.brand_color || DEFAULT_COLOR
        applyBrandColor(colorToApply)
      } catch (error) {
        console.error('Error loading user color:', error)
        applyBrandColor(DEFAULT_COLOR)
      }
    }

    loadUserColor()
  }, [user, applyBrandColor, resetToDefaultColors, location.pathname])

  return { applyBrandColor, saveBrandColor, resetToDefaultColors }
}