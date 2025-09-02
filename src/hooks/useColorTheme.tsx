import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const DEFAULT_COLOR = '217 91% 45%' // Azul profissional padrão

export const useColorTheme = () => {
  const { user } = useAuth()

  const applyBrandColor = (colorValue: string) => {
    // Update CSS custom property
    document.documentElement.style.setProperty('--primary', colorValue)
    document.documentElement.style.setProperty('--primary-glow', colorValue.replace('45%', '60%'))
    
    // Create gradient variations
    const hslValues = colorValue.match(/\d+/g)
    if (hslValues && hslValues.length >= 3) {
      const [h, s] = hslValues
      const darkerL = Math.max(25, parseInt(hslValues[2]) - 10)
      const gradient = `linear-gradient(135deg, hsl(${h} ${s}% ${hslValues[2]}%), hsl(${h} ${s}% ${darkerL}%))`
      document.documentElement.style.setProperty('--gradient-primary', gradient)
    }
  }

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
      if (!user) return

      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('brand_color')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data?.brand_color) {
          applyBrandColor(data.brand_color)
        } else {
          // Aplicar cor padrão para novos usuários
          applyBrandColor(DEFAULT_COLOR)
        }
      } catch (error) {
        console.error('Error loading user color:', error)
        // Em caso de erro, aplicar cor padrão
        applyBrandColor(DEFAULT_COLOR)
      }
    }

    loadUserColor()
  }, [user])

  return { applyBrandColor, saveBrandColor }
}