import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useTerminology } from '@/hooks/useTerminology'

/**
 * Hook that checks for client birthdays on the current day and creates notifications
 * Runs on mount and whenever clients are updated
 */
export const useBirthdayNotifications = () => {
  const { user } = useAuth()
  const { clientTerm } = useTerminology()
  const isCheckingRef = useRef(false)

  const checkBirthdays = useCallback(async () => {
    if (!user || isCheckingRef.current) return

    isCheckingRef.current = true

    try {
      const today = new Date()
      const currentMonth = today.getMonth() + 1
      const currentDay = today.getDate()
      const todayKey = `${today.getFullYear()}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

      // Fetch all active clients with birthdays
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, nome, data_nascimento, avatar_url')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .not('data_nascimento', 'is', null)

      if (error) {
        console.error('[BirthdayNotifications] Error fetching clients:', error)
        return
      }

      if (!clients || clients.length === 0) {
        return
      }

      // Filter clients with birthday today
      const birthdayClients = clients.filter(client => {
        if (!client.data_nascimento) return false
        const birthDate = new Date(client.data_nascimento + 'T00:00:00')
        return birthDate.getMonth() + 1 === currentMonth && birthDate.getDate() === currentDay
      })

      if (birthdayClients.length === 0) {
        console.log('[BirthdayNotifications] No birthdays today')
        return
      }

      console.log(`[BirthdayNotifications] Found ${birthdayClients.length} birthday(s) today`)

      // Check existing notifications for today to avoid duplicates
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('conteudo')
        .eq('user_id', user.id)
        .gte('data', todayKey + 'T00:00:00')
        .lte('data', todayKey + 'T23:59:59')
        .ilike('titulo', '%Aniversário%')

      const existingClientIds = new Set(
        (existingNotifications || [])
          .map(n => {
            const match = n.conteudo.match(/cliente=([a-f0-9-]+)/)
            return match ? match[1] : null
          })
          .filter(Boolean)
      )

      // Create notifications for each birthday client (if not already notified)
      for (const client of birthdayClients) {
        if (existingClientIds.has(client.id)) {
          console.log(`[BirthdayNotifications] Already notified for ${client.nome}`)
          continue
        }

        const birthDate = new Date(client.data_nascimento + 'T00:00:00')
        const birthYear = birthDate.getFullYear()
        const age = today.getFullYear() - birthYear

        const ageText = age > 0 && age < 150 ? ` Hoje completa ${age} anos.` : ''
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            titulo: `🎂 Aniversário de ${clientTerm}`,
            conteudo: `Hoje é aniversário de ${client.nome}!${ageText} [Ver ${clientTerm}](/clientes?cliente=${client.id})`
          })

        if (notifError) {
          console.error(`[BirthdayNotifications] Error creating notification for ${client.nome}:`, notifError)
        } else {
          console.log(`[BirthdayNotifications] Created birthday notification for ${client.nome}`)
        }
      }

    } catch (error) {
      console.error('[BirthdayNotifications] Error:', error)
    } finally {
      isCheckingRef.current = false
    }
  }, [user, clientTerm])

  useEffect(() => {
    if (!user) return

    // Check on mount
    const timeout = setTimeout(checkBirthdays, 2000)

    // Subscribe to client changes to recheck when a client is updated
    const channel = supabase
      .channel('birthday-check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[BirthdayNotifications] Client updated, rechecking birthdays...')
          checkBirthdays()
        }
      )
      .subscribe()

    return () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  }, [user, checkBirthdays])
}
