import { useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

const DEFAULT_COLOR = '217 91% 45%' // Azul profissional padrão

export const useColorTheme = () => {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const applyBrandColor = useCallback((colorValue: string) => {
    // Update CSS custom property with !important to override theme defaults
    document.documentElement.style.setProperty('--primary', colorValue, 'important')
    document.documentElement.style.setProperty('--primary-glow', colorValue.replace('45%', '60%'))
    document.documentElement.style.setProperty('--sidebar-primary', colorValue, 'important')
    
    // Create gradient variations
    const hslValues = colorValue.match(/\d+/g)
    if (hslValues && hslValues.length >= 3) {
      const [h, s] = hslValues
      const darkerL = Math.max(25, parseInt(hslValues[2]) - 10)
      const gradient = `linear-gradient(135deg, hsl(${h} ${s}% ${hslValues[2]}%), hsl(${h} ${s}% ${darkerL}%))`
      document.documentElement.style.setProperty('--gradient-primary', gradient)
    }
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

  useEffect(() => {
    const loadUserColor = async () => {
      if (!user) {
        // Garantir tema light e cor padrão para usuários não logados
        if (theme !== 'light') {
          setTheme('light')
        }
        applyBrandColor(DEFAULT_COLOR)
        return
      }

      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('brand_color')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data?.brand_color) {
          applyBrandColor(data.brand_color)
        } else {
          // Aplicar cor padrão para novos usuários e garantir tema light
          if (theme !== 'light') {
            setTheme('light')
          }
          applyBrandColor(DEFAULT_COLOR)
        }
      } catch (error) {
        console.error('Error loading user color:', error)
        // Em caso de erro, aplicar cor padrão e tema light
        if (theme !== 'light') {
          setTheme('light')
        }
        applyBrandColor(DEFAULT_COLOR)
      }
    }

    loadUserColor()
  }, [user, theme, setTheme, applyBrandColor])

  // Reaplicar cor quando tema muda
  useEffect(() => {
    if (user) {
      const reapplyColor = async () => {
        try {
          const { data } = await supabase
            .from('configuracoes')
            .select('brand_color')
            .eq('user_id', user.id)
            .maybeSingle()

          if (data?.brand_color) {
            // Pequeno delay para garantir que o tema foi aplicado
            setTimeout(() => {
              applyBrandColor(data.brand_color)
            }, 100)
          }
        } catch (error) {
          console.error('Error reapplying color:', error)
        }
      }
      
      reapplyColor()
    }
  }, [theme, user, applyBrandColor])

  return { applyBrandColor, saveBrandColor }
}