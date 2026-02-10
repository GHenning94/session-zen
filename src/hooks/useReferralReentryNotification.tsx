import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const COOLDOWN_DAYS = 30

/**
 * Verifica ao entrar na plataforma se o período de carência do programa de indicação
 * expirou e, se sim, cria a notificação "Você pode reingressar no programa de indicação!"
 * para que apareça assim que o usuário logar, não só ao visitar a página de indicação.
 */
export const useReferralReentryNotification = () => {
  const { user } = useAuth()
  const alreadyCheckedRef = useRef(false)

  useEffect(() => {
    if (!user?.id || alreadyCheckedRef.current) return

    const checkAndCreateNotification = async () => {
      alreadyCheckedRef.current = true

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('left_referral_program_at, is_referral_partner')
          .eq('user_id', user.id)
          .single()

        if (profileError || !profile) return
        if (profile.is_referral_partner || !profile.left_referral_program_at) return

        const leftDate = new Date(profile.left_referral_program_at)
        const cooldownEnd = new Date(leftDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
        if (cooldownEnd > new Date()) return

        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('lida', false)
          .ilike('titulo', '%reingressar no programa%')
          .maybeSingle()

        if (existingNotification) return

        await supabase.from('notifications').insert({
          user_id: user.id,
          titulo: '🎉 Você pode reingressar no programa de indicação!',
          conteudo:
            'O período de carência de 30 dias terminou. Você pode agora reingressar no Programa de Indicação e começar a ganhar comissões novamente. [REDIRECT:/programa-indicacao]',
        })

        await supabase
          .from('profiles')
          .update({ left_referral_program_at: null })
          .eq('user_id', user.id)
      } catch (err) {
        console.error('[ReferralReentryNotification] Error:', err)
      }
    }

    checkAndCreateNotification()
  }, [user?.id])
}
