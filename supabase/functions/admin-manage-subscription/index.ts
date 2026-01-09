import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-session',
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { 
      sessionToken, 
      action, 
      userId, 
      newPlan, 
      reason,
      trialDays,
      immediate 
    } = body

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin session
    const { data: session, error: sessionError } = await supabaseClient
      .from('admin_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired admin session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminId = session.user_id

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const previousPlan = profile.subscription_plan
    const previousInterval = profile.billing_interval

    console.log(`[Admin Manage Subscription] Action: ${action}, User: ${userId}, Admin: ${adminId}`)

    let result: any = { success: true }

    switch (action) {
      case 'change_plan_immediate': {
        // ============================================
        // TROCAR PLANO IMEDIATAMENTE (OVERRIDE TOTAL)
        // ============================================
        
        // 1. Cancel Stripe subscription if exists
        if (profile.stripe_subscription_id) {
          try {
            await stripe.subscriptions.cancel(profile.stripe_subscription_id, {
              invoice_now: false,
              prorate: false
            })
            console.log(`[Admin Manage Subscription] Cancelled Stripe subscription: ${profile.stripe_subscription_id}`)
          } catch (stripeError) {
            console.log(`[Admin Manage Subscription] Could not cancel Stripe subscription:`, stripeError)
          }
        }

        // 2. Update profile to new plan
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            subscription_plan: newPlan || 'basico',
            billing_interval: newPlan === 'basico' ? null : profile.billing_interval,
            stripe_subscription_id: newPlan === 'basico' ? null : profile.stripe_subscription_id,
            subscription_end_date: null,
            subscription_cancel_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) throw updateError

        // 3. Cancel pending commissions if downgrading
        if (newPlan === 'basico' || (previousPlan === 'premium' && newPlan === 'pro')) {
          const { error: cancelCommError } = await supabaseClient
            .from('referral_payouts')
            .update({ 
              status: 'cancelled',
              failure_reason: `Admin override: plan changed from ${previousPlan} to ${newPlan}`,
              updated_at: new Date().toISOString()
            })
            .eq('referred_user_id', userId)
            .in('status', ['pending', 'approved'])

          if (cancelCommError) {
            console.log('[Admin Manage Subscription] Error cancelling commissions:', cancelCommError)
          } else {
            console.log('[Admin Manage Subscription] Cancelled pending commissions')
          }
        }

        // 4. Log admin action
        await supabaseClient.from('audit_log').insert({
          table_name: 'profiles',
          record_id: userId,
          action: 'admin_plan_change_immediate',
          user_id: adminId,
          old_values: { 
            subscription_plan: previousPlan, 
            billing_interval: previousInterval 
          },
          new_values: { 
            subscription_plan: newPlan,
            reason
          }
        })

        result = { 
          success: true, 
          message: `Plano alterado de ${previousPlan} para ${newPlan} imediatamente`,
          previousPlan,
          newPlan
        }
        break
      }

      case 'change_plan_end_of_cycle': {
        // ============================================
        // TROCAR PLANO NO FIM DO CICLO
        // ============================================
        
        if (!profile.stripe_subscription_id) {
          return new Response(
            JSON.stringify({ error: 'Usuário não tem assinatura Stripe ativa' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Schedule cancellation at period end
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          cancel_at_period_end: true,
          metadata: {
            scheduled_plan: newPlan,
            scheduled_by_admin: adminId,
            reason
          }
        })

        // Update profile with scheduled change
        await supabaseClient
          .from('profiles')
          .update({
            subscription_cancel_at: profile.subscription_end_date,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        // Log admin action
        await supabaseClient.from('audit_log').insert({
          table_name: 'profiles',
          record_id: userId,
          action: 'admin_plan_change_scheduled',
          user_id: adminId,
          old_values: { 
            subscription_plan: previousPlan 
          },
          new_values: { 
            scheduled_plan: newPlan,
            scheduled_at: profile.subscription_end_date,
            reason
          }
        })

        result = { 
          success: true, 
          message: `Mudança para ${newPlan} agendada para o fim do ciclo atual`,
          previousPlan,
          newPlan,
          scheduledAt: profile.subscription_end_date
        }
        break
      }

      case 'grant_trial': {
        // ============================================
        // CONCEDER ACESSO TEMPORÁRIO (TRIAL)
        // ============================================
        
        const days = trialDays || 14
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + days)

        // Update profile with trial
        const { error: trialError } = await supabaseClient
          .from('profiles')
          .update({
            subscription_plan: newPlan || 'premium',
            subscription_end_date: trialEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (trialError) throw trialError

        // Log admin action
        await supabaseClient.from('audit_log').insert({
          table_name: 'profiles',
          record_id: userId,
          action: 'admin_grant_trial',
          user_id: adminId,
          old_values: { 
            subscription_plan: previousPlan 
          },
          new_values: { 
            trial_plan: newPlan || 'premium',
            trial_days: days,
            trial_ends_at: trialEndDate.toISOString(),
            reason
          }
        })

        result = { 
          success: true, 
          message: `Trial de ${days} dias do plano ${newPlan || 'premium'} concedido`,
          trialEndsAt: trialEndDate.toISOString()
        }
        break
      }

      case 'cancel_subscription': {
        // ============================================
        // CANCELAR ASSINATURA
        // ============================================
        
        if (profile.stripe_subscription_id) {
          if (immediate) {
            await stripe.subscriptions.cancel(profile.stripe_subscription_id)
          } else {
            await stripe.subscriptions.update(profile.stripe_subscription_id, {
              cancel_at_period_end: true
            })
          }
        }

        // Update profile
        if (immediate) {
          await supabaseClient
            .from('profiles')
            .update({
              subscription_plan: 'basico',
              stripe_subscription_id: null,
              subscription_end_date: null,
              subscription_cancel_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
        } else {
          await supabaseClient
            .from('profiles')
            .update({
              subscription_cancel_at: profile.subscription_end_date,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
        }

        // Cancel pending commissions
        await supabaseClient
          .from('referral_payouts')
          .update({ 
            status: 'cancelled',
            failure_reason: `Admin cancellation: ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('referred_user_id', userId)
          .in('status', ['pending', 'approved'])

        // Log admin action
        await supabaseClient.from('audit_log').insert({
          table_name: 'profiles',
          record_id: userId,
          action: immediate ? 'admin_cancel_immediate' : 'admin_cancel_scheduled',
          user_id: adminId,
          old_values: { 
            subscription_plan: previousPlan 
          },
          new_values: { 
            cancelled: true,
            immediate,
            reason
          }
        })

        result = { 
          success: true, 
          message: immediate 
            ? 'Assinatura cancelada imediatamente' 
            : 'Assinatura será cancelada no fim do ciclo'
        }
        break
      }

      case 'reactivate_subscription': {
        // ============================================
        // REATIVAR ASSINATURA
        // ============================================
        
        if (profile.stripe_subscription_id) {
          await stripe.subscriptions.update(profile.stripe_subscription_id, {
            cancel_at_period_end: false
          })
        }

        await supabaseClient
          .from('profiles')
          .update({
            subscription_cancel_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        // Log admin action
        await supabaseClient.from('audit_log').insert({
          table_name: 'profiles',
          record_id: userId,
          action: 'admin_reactivate_subscription',
          user_id: adminId,
          old_values: { 
            subscription_cancel_at: profile.subscription_cancel_at 
          },
          new_values: { 
            reactivated: true,
            reason
          }
        })

        result = { 
          success: true, 
          message: 'Assinatura reativada com sucesso'
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`[Admin Manage Subscription] Action completed:`, result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Admin Manage Subscription] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
