import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Taxas de comissão do programa de indicação
const FIRST_MONTH_COMMISSION_RATE = 0.30; // 30% primeiro mês mensal
const RECURRING_MONTHLY_COMMISSION_RATE = 0.15; // 15% meses seguintes mensal
const ANNUAL_COMMISSION_RATE = 0.20; // 20% anual

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    // ✅ MODO 1: Verificação com webhook secret (mais seguro)
    if (signature && webhookSecret) {
      console.log('[webhook] 🔐 Using signature verification');
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('[webhook] ❌ Signature verification failed:', err);
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } 
    // ✅ MODO 2: Fallback - Verificar evento diretamente na API do Stripe
    else {
      console.log('[webhook] ⚠️ No webhook secret configured, using API verification');
      
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        console.error('[webhook] ❌ Failed to parse request body');
        return new Response("Invalid JSON body", { status: 400 });
      }

      // Verificar se o evento existe no Stripe (anti-spoofing)
      if (!parsedBody.id || !parsedBody.type) {
        console.error('[webhook] ❌ Missing event id or type');
        return new Response("Invalid event format", { status: 400 });
      }

      try {
        // Buscar o evento diretamente na API do Stripe para verificar autenticidade
        event = await stripe.events.retrieve(parsedBody.id);
        console.log('[webhook] ✅ Event verified via API:', event.id);
      } catch (err) {
        console.error('[webhook] ❌ Event not found in Stripe:', parsedBody.id);
        return new Response("Event not found in Stripe", { status: 404 });
      }
    }

    console.log(`[webhook] 📨 Processing event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        // MELHORADO: Buscar metadata do checkout E da subscription
        let userId = session.metadata?.user_id;
        let planName = session.metadata?.plan_name || 'pro';
        let billingInterval = session.metadata?.billing_interval || 'monthly';
        const referralCode = session.metadata?.referral_code; // Código de indicação

        // Se não encontrar userId nos metadados da sessão, buscar do customer
        if (!userId) {
          console.log('[webhook] Buscando user_id pelo customer_id:', customerId)
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (profile) {
            userId = profile.user_id;
            console.log('[webhook] User_id encontrado no perfil:', userId)
          }
        }

        if (!userId) {
          console.error('[webhook] ❌ No user_id found in session or customer');
          break;
        }

        console.log('[webhook] 💳 Checkout completed:', {
          user: userId,
          plan: planName,
          interval: billingInterval,
          customer: customerId,
          subscription: subscriptionId,
          referralCode,
        });
        
        // Calcular data de próxima renovação
        const currentDate = new Date();
        const nextBillingDate = new Date(currentDate);
        
        if (billingInterval === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        // Atualizar perfil com informações completas da assinatura
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_plan: planName,
            billing_interval: billingInterval,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_end_date: nextBillingDate.toISOString(),
            subscription_cancel_at: null
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[webhook] ❌ Error updating profile:', updateError);
        } else {
          console.log('[webhook] ✅ Profile updated successfully to plan:', planName);
          
          // ✅ PROCESSAR INDICAÇÃO se houver código
          if (referralCode) {
            await processReferral(userId, referralCode, planName, session.amount_total || 0, billingInterval);
          }
          
          // Criar notificação de boas-vindas
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              titulo: 'Bem-vindo ao TherapyPro!',
              conteudo: `Sua assinatura ${planName === 'premium' ? 'Premium' : 'Profissional'} foi ativada com sucesso. Aproveite todos os recursos!`
            });

          // Enviar email de upgrade com recibo
          try {
            // Buscar invoice mais recente do cliente
            const invoices = await stripe.invoices.list({
              customer: customerId,
              limit: 1
            });
            
            const invoice = invoices.data[0];
            
            // Chamar edge function de envio de email
            const emailPayload = {
              userId,
              planName,
              billingInterval,
              invoiceUrl: invoice?.hosted_invoice_url || null,
              invoicePdf: invoice?.invoice_pdf || null,
              amount: invoice?.amount_paid || session.amount_total
            };
            
            console.log('[webhook] 📧 Sending upgrade email with payload:', emailPayload);
            
            // Fazer chamada interna para send-upgrade-email
            const emailResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-upgrade-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                },
                body: JSON.stringify(emailPayload)
              }
            );
            
            if (emailResponse.ok) {
              console.log('[webhook] ✅ Upgrade email sent successfully');
            } else {
              const emailError = await emailResponse.text();
              console.error('[webhook] ⚠️ Failed to send upgrade email:', emailError);
            }
          } catch (emailErr) {
            console.error('[webhook] ⚠️ Error sending upgrade email:', emailErr);
            // Não falhar o webhook por causa do email
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] 🆕 Subscription created:', {
          subscription: subscription.id,
          customer: customerId,
          status: subscription.status,
          metadata: subscription.metadata
        });

        // Buscar usuário pelo customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('[webhook] ❌ Profile not found for customer:', customerId);
          break;
        }

        // Determinar plano baseado no price ID
        const priceId = subscription.items.data[0]?.price.id;
        const priceToPlans: { [key: string]: string } = {
          'price_1RowvqFeTymAqTGEU6jkKtXi': 'pro',
          'price_1SMifUFeTymAqTGEucpJaUBz': 'pro',
          'price_1SSMOBCP57sNVd3lqjfLY6Du': 'premium',
          'price_1SSMP7CP57sNVd3lSf4oYINX': 'premium'
        };
        
        const planName = priceId && priceToPlans[priceId] ? priceToPlans[priceId] : 'pro';
        const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';

        // Atualizar profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: planName,
            billing_interval: billingInterval === 'year' ? 'yearly' : 'monthly',
            stripe_subscription_id: subscription.id,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error('[webhook] ❌ Error updating subscription:', updateError);
        } else {
          console.log('[webhook] ✅ Subscription created and profile updated:', planName);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        console.log('[webhook] 💰 Payment succeeded for invoice:', invoice.id);

        // Buscar usuário pelo stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_plan, billing_interval')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Calcular próxima data de cobrança
          const nextBillingDate = new Date(invoice.period_end * 1000);

          // Atualizar data de renovação
          await supabase
            .from('profiles')
            .update({
              subscription_end_date: nextBillingDate.toISOString(),
              subscription_cancel_at: null
            })
            .eq('user_id', profile.user_id);

          console.log('[webhook] ✅ Next billing date updated:', nextBillingDate.toISOString());

          // ✅ PROCESSAR COMISSÃO DE INDICAÇÃO para pagamentos recorrentes
          await processReferralCommission(profile.user_id, invoice.amount_paid || 0, profile.subscription_plan);

          // Notificar usuário
          await supabase
            .from('notifications')
            .insert({
              user_id: profile.user_id,
              titulo: 'Pagamento Confirmado',
              conteudo: `Seu pagamento de R$ ${(invoice.amount_paid / 100).toFixed(2)} foi processado com sucesso. Próxima cobrança: ${nextBillingDate.toLocaleDateString('pt-BR')}`
            });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] 🔄 Subscription updated:', {
          subscription: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          items: subscription.items.data.map(item => ({
            price: item.price.id,
            product: item.price.product
          }))
        });

        // Buscar usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, subscription_plan')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const isActive = subscription.status === 'active';
          
          // Buscar os metadados do preço para descobrir o plano
          const priceId = subscription.items.data[0]?.price.id;
          let newPlanName = profile.subscription_plan;
          
          // Mapear price IDs para planos
          const priceToPlans: { [key: string]: string } = {
            'price_1RowvqFeTymAqTGEU6jkKtXi': 'pro',  // Profissional Mensal
            'price_1SMifUFeTymAqTGEucpJaUBz': 'pro',  // Profissional Anual
            'price_1SSMOBCP57sNVd3lqjfLY6Du': 'premium', // Premium Mensal
            'price_1SSMP7CP57sNVd3lSf4oYINX': 'premium'  // Premium Anual
          };
          
          if (priceId && priceToPlans[priceId]) {
            newPlanName = priceToPlans[priceId];
          }
          
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';

          const updateData: any = {
            subscription_plan: isActive ? newPlanName : 'basico',
            billing_interval: isActive ? (billingInterval === 'year' ? 'yearly' : 'monthly') : null,
          };

          // ✅ PERÍODO DE CARÊNCIA: Se cancelado, manter acesso até o fim do período
          if (subscription.cancel_at_period_end || subscription.cancel_at) {
            updateData.subscription_cancel_at = subscription.cancel_at 
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : new Date(subscription.current_period_end * 1000).toISOString();
            
            console.log('[webhook] ⚠️ Subscription will cancel at:', updateData.subscription_cancel_at);
          } else {
            updateData.subscription_cancel_at = null;
          }

          console.log('[webhook] 📝 Updating profile with:', updateData);

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error('[webhook] ❌ Error updating subscription:', updateError);
          } else {
            console.log('[webhook] ✅ Subscription updated successfully - New plan:', newPlanName);

            // Notificar sobre cancelamento agendado
            if (subscription.cancel_at_period_end) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: profile.user_id,
                  titulo: 'Assinatura Cancelada',
                  conteudo: `Sua assinatura foi cancelada mas você terá acesso até ${new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')}`
                });
            } else if (isActive && newPlanName !== profile.subscription_plan) {
              // Notificar sobre mudança de plano
              await supabase
                .from('notifications')
                .insert({
                  user_id: profile.user_id,
                  titulo: 'Plano Atualizado',
                  conteudo: `Seu plano foi alterado para ${newPlanName === 'premium' ? 'Premium' : 'Profissional'} com sucesso!`
                });
            }
          }
        } else {
          console.error('[webhook] ❌ Profile not found for customer:', customerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] 🗑️ Subscription deleted:', subscription.id);

        // Buscar usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // ✅ Atualizar status do referral se houver
          await supabase
            .from('referrals')
            .update({ status: 'cancelled' })
            .eq('referred_user_id', profile.user_id);

          // ✅ Reverter para plano gratuito
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              subscription_plan: 'basico',
              billing_interval: null,
              subscription_cancel_at: null,
              subscription_end_date: null,
              stripe_subscription_id: null
            })
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error('[webhook] ❌ Error deleting subscription:', updateError);
          } else {
            console.log('[webhook] ✅ User reverted to basic plan');
            
            await supabase
              .from('notifications')
              .insert({
                user_id: profile.user_id,
                titulo: 'Assinatura Encerrada',
                conteudo: 'Sua assinatura foi encerrada. Você agora está no plano gratuito com funcionalidades limitadas.'
              });
          }
        }
        break;
      }

      default:
        console.log(`[webhook] ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[webhook] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

// Função para extrair user_id do código de indicação
async function extractReferrerFromCode(referralCode: string): Promise<string | null> {
  // Se já é um UUID completo, retornar como está
  if (referralCode.length === 36 && referralCode.includes('-')) {
    return referralCode;
  }
  
  // Formato REF-XXXXXXXX - extrair a parte do user_id
  const userIdPart = referralCode.replace('REF-', '').toLowerCase();
  
  // Buscar usuário que corresponde ao início do user_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('is_referral_partner', true);
  
  const referrer = profiles?.find(profile => 
    profile.user_id.slice(0, 8).toLowerCase() === userIdPart
  );
  
  return referrer?.user_id || null;
}

// Função para processar indicação inicial
async function processReferral(
  referredUserId: string, 
  referralCode: string, 
  planName: string, 
  amountPaid: number,
  billingInterval: string
) {
  console.log('[webhook] 🎯 Processing referral:', { referredUserId, referralCode, planName, amountPaid, billingInterval });

  try {
    // Extrair o user_id real do código de indicação
    const referrerUserId = await extractReferrerFromCode(referralCode);
    
    if (!referrerUserId) {
      console.log('[webhook] ⚠️ Could not find referrer from code:', referralCode);
      return;
    }

    // Bloquear auto-indicação
    if (referrerUserId === referredUserId) {
      console.log('[webhook] ⚠️ Self-referral blocked');
      return;
    }

    // Verificar se o referrer é parceiro de indicação
    const { data: referrer } = await supabase
      .from('profiles')
      .select('user_id, nome, is_referral_partner')
      .eq('user_id', referrerUserId)
      .single();

    if (!referrer || !referrer.is_referral_partner) {
      console.log('[webhook] ⚠️ Referral code invalid or user not a partner');
      return;
    }

    // Buscar nome do indicado
    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', referredUserId)
      .single();

    // Calcular comissão baseada no intervalo de cobrança
    // Mensal: 30% no primeiro mês
    // Anual: 20%
    const isAnnual = billingInterval === 'yearly' || billingInterval === 'year';
    const commissionRate = isAnnual ? ANNUAL_COMMISSION_RATE : FIRST_MONTH_COMMISSION_RATE;
    const commissionAmount = Math.round(amountPaid * commissionRate);

    // Verificar se já existe referral PENDENTE para este usuário (criada no cadastro)
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', referredUserId)
      .single();

    let referral;

    if (existingReferral) {
      // Atualizar referral existente para 'converted'
      const { data: updatedReferral, error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'converted',
          subscription_plan: planName,
          subscription_amount: amountPaid,
          commission_rate: commissionRate * 100,
          commission_amount: commissionAmount,
          first_payment_date: new Date().toISOString(),
        })
        .eq('id', existingReferral.id)
        .select()
        .single();

      if (updateError) {
        console.error('[webhook] ❌ Error updating referral:', updateError);
        return;
      }
      
      referral = updatedReferral;
      console.log('[webhook] ✅ Referral updated to converted:', referral.id);
    } else {
      // Criar novo registro de referral (caso não tenha sido criado no cadastro)
      const { data: newReferral, error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id: referrerUserId,
          referred_user_id: referredUserId,
          referral_code: referralCode,
          status: 'converted',
          subscription_plan: planName,
          subscription_amount: amountPaid,
          commission_rate: commissionRate * 100,
          commission_amount: commissionAmount,
          first_payment_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (referralError) {
        console.error('[webhook] ❌ Error creating referral:', referralError);
        return;
      }

      referral = newReferral;
      console.log('[webhook] ✅ Referral created:', referral.id);
    }

    // Criar registro de payout pendente
    await supabase
      .from('referral_payouts')
      .insert({
        referrer_user_id: referrerUserId,
        referral_id: referral.id,
        amount: commissionAmount,
        currency: 'brl',
        status: 'pending',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        referred_user_name: referredProfile?.nome || 'Novo usuário',
        referred_plan: planName,
      });

    console.log('[webhook] ✅ Payout record created');

    // Notificar o referrer sobre a assinatura
    const commissionDisplay = isAnnual ? '20%' : '30%';
    await supabase
      .from('notifications')
      .insert({
        user_id: referrerUserId,
        titulo: 'Indicação convertida em assinatura! 💰',
        conteudo: `${referredProfile?.nome || 'Um usuário indicado'} assinou o plano ${planName === 'premium' ? 'Premium' : 'Profissional'} através da sua indicação! Você ganhou R$ ${(commissionAmount / 100).toFixed(2).replace('.', ',')} (${commissionDisplay}) de comissão.`,
      });

    // Tentar processar payout automaticamente
    await tryProcessPayout(referrerUserId);

  } catch (err) {
    console.error('[webhook] ❌ Error processing referral:', err);
  }
}

// Função para processar comissão de pagamentos recorrentes
async function processReferralCommission(
  referredUserId: string, 
  amountPaid: number, 
  planName: string,
  billingInterval?: string
) {
  console.log('[webhook] 🔄 Processing recurring commission:', { referredUserId, amountPaid, billingInterval });

  try {
    // Buscar referral ativo para este usuário
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', referredUserId)
      .eq('status', 'converted')
      .single();

    if (!referral) {
      console.log('[webhook] ℹ️ No active referral for this user');
      return;
    }

    // Buscar o billing_interval do referred user se não fornecido
    let interval = billingInterval;
    if (!interval) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('billing_interval')
        .eq('user_id', referredUserId)
        .single();
      interval = profile?.billing_interval || 'monthly';
    }

    // Calcular comissão baseada no intervalo
    // Mensal: 15% (meses seguintes)
    // Anual: 20%
    const isAnnual = interval === 'yearly' || interval === 'year';
    const commissionRate = isAnnual ? ANNUAL_COMMISSION_RATE : RECURRING_MONTHLY_COMMISSION_RATE;
    const commissionAmount = Math.round(amountPaid * commissionRate);

    // Buscar nome do indicado
    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('user_id', referredUserId)
      .single();

    // Criar registro de payout
    await supabase
      .from('referral_payouts')
      .insert({
        referrer_user_id: referral.referrer_user_id,
        referral_id: referral.id,
        amount: commissionAmount,
        currency: 'brl',
        status: 'pending',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        referred_user_name: referredProfile?.nome || 'Usuário',
        referred_plan: planName,
      });

    const rateDisplay = isAnnual ? '20%' : '15%';
    console.log('[webhook] ✅ Recurring commission payout created:', commissionAmount, `(${rateDisplay})`);

    // Notificar o referrer
    await supabase
      .from('notifications')
      .insert({
        user_id: referral.referrer_user_id,
        titulo: 'Comissão Recorrente! 💰',
        conteudo: `${referredProfile?.nome || 'Seu indicado'} renovou a assinatura. Você receberá R$ ${(commissionAmount / 100).toFixed(2)} (${rateDisplay}) de comissão.`,
      });

    // Tentar processar payout automaticamente
    await tryProcessPayout(referral.referrer_user_id);

  } catch (err) {
    console.error('[webhook] ❌ Error processing recurring commission:', err);
  }
}

// Função para tentar processar payout automaticamente
async function tryProcessPayout(referrerUserId: string) {
  try {
    // Verificar se o referrer tem conta Connect ativa
    const { data: connectAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', referrerUserId)
      .single();

    if (!connectAccount || !connectAccount.payouts_enabled) {
      console.log('[webhook] ⚠️ Referrer does not have active Connect account');
      
      // Verificar se tem dados bancários
      const { data: profile } = await supabase
        .from('profiles')
        .select('banco, agencia, conta')
        .eq('user_id', referrerUserId)
        .single();

      if (!profile?.banco || !profile?.agencia || !profile?.conta) {
        // Enviar notificação para preencher dados bancários
        await supabase
          .from('notifications')
          .insert({
            user_id: referrerUserId,
            titulo: 'Complete seus dados bancários',
            conteudo: 'Para receber suas comissões do programa de indicação, complete seus dados bancários nas configurações.',
          });
      }
      return;
    }

    // Chamar edge function para processar payouts
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/referral-process-payout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({})
      }
    );

    if (response.ok) {
      console.log('[webhook] ✅ Payout processing triggered');
    } else {
      console.error('[webhook] ⚠️ Failed to trigger payout processing');
    }
  } catch (err) {
    console.error('[webhook] ❌ Error triggering payout:', err);
  }
}
