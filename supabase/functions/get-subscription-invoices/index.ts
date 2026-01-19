import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.log('[get-subscription-invoices] ⚠️ No STRIPE_SECRET_KEY configured');
      return new Response(JSON.stringify({ 
        invoices: [],
        subscription: null,
        currentPlan: 'basico'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[get-subscription-invoices] 📋 Fetching invoices for user:', user.id);

    // Get user profile to find Stripe customer and subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, stripe_customer_id, stripe_subscription_id, billing_interval')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Usar apenas o stripe_customer_id do perfil
    // NÃO buscar por email para evitar mostrar faturas de contas antigas deletadas
    const customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      // Nova conta ainda não tem customer no Stripe - retornar lista vazia
      console.log('[get-subscription-invoices] ℹ️ No stripe_customer_id - new account has no invoices');
      return new Response(JSON.stringify({ 
        invoices: [],
        subscription: null,
        currentPlan: profile.subscription_plan || 'basico'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('[get-subscription-invoices] 👤 Customer ID:', customerId);

    // Get active subscription
    let subscriptionInfo = null;
    let subscriptionId = profile.stripe_subscription_id;

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription && (subscription.status === 'active' || subscription.status === 'canceled')) {
          subscriptionInfo = {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            current_period_start: subscription.current_period_start,
            cancel_at_period_end: subscription.cancel_at_period_end,
          };
        }
      } catch (subErr) {
        console.log('[get-subscription-invoices] ⚠️ Could not retrieve subscription:', subErr);
      }
    }

    // Se não encontrou pelo ID, buscar pela lista
    if (!subscriptionInfo) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        subscriptionInfo = {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          current_period_start: subscription.current_period_start,
          cancel_at_period_end: subscription.cancel_at_period_end,
        };
        subscriptionId = subscription.id;
      }
    }

    console.log('[get-subscription-invoices] 📅 Subscription info:', subscriptionInfo);
    console.log('[get-subscription-invoices] 🔗 Current subscription ID:', subscriptionId);

    // ✅ IMPORTANTE: Buscar faturas relevantes para esta conta
    // 1. Faturas da assinatura atual (subscription_create, subscription_cycle, subscription_update)
    // 2. Faturas manuais de upgrade (type: 'proration_upgrade' no metadata)
    
    let allInvoices: Stripe.Invoice[] = [];
    
    // Buscar faturas da assinatura atual
    if (subscriptionId) {
      const subscriptionInvoices = await stripe.invoices.list({
        customer: customerId,
        subscription: subscriptionId,
        limit: 50,
      });
      allInvoices = [...subscriptionInvoices.data];
      console.log('[get-subscription-invoices] 📋 Subscription invoices:', subscriptionInvoices.data.length);
    }
    
    // Buscar faturas manuais recentes (para pegar proration upgrades)
    // Filtrar por metadata.user_id para garantir que são da conta correta
    const manualInvoices = await stripe.invoices.list({
      customer: customerId,
      limit: 20,
    });
    
    // Adicionar apenas faturas manuais de upgrade que pertencem ao usuário atual
    // e que têm o metadata correto (type: proration_upgrade, user_id matches)
    const userId = user.id;
    const prorationInvoices = manualInvoices.data.filter(inv => {
      const isProration = inv.metadata?.type === 'proration_upgrade';
      const isCurrentUser = inv.metadata?.user_id === userId;
      const notAlreadyIncluded = !allInvoices.some(existing => existing.id === inv.id);
      return isProration && isCurrentUser && notAlreadyIncluded;
    });
    
    allInvoices = [...allInvoices, ...prorationInvoices];
    
    // Ordenar por data (mais recentes primeiro)
    allInvoices.sort((a, b) => b.created - a.created);

    console.log('[get-subscription-invoices] 📃 Total invoices to process:', allInvoices.length);
    console.log('[get-subscription-invoices] 📃 Proration invoices added:', prorationInvoices.length);

    // ✅ Filtrar faturas válidas
    // Incluir: paid (pagas), open (pendentes de pagamento)
    // Excluir: draft, void, uncollectible
    // IMPORTANTE: Para proration, o valor pode estar em amount_paid ou total
    const formattedInvoices = allInvoices
      .filter(invoice => {
        // Verificar se tem algum valor (pode ser negativo para créditos)
        const hasAmount = invoice.amount_due > 0 || invoice.amount_paid > 0 || Math.abs(invoice.total || 0) > 0;
        const isValidStatus = invoice.status === 'paid' || invoice.status === 'open';
        const isNotDraft = !invoice.draft;
        
        console.log(`[get-subscription-invoices] 🔍 Invoice ${invoice.number}: amount_due=${invoice.amount_due}, amount_paid=${invoice.amount_paid}, total=${invoice.total}, subtotal=${invoice.subtotal}, status=${invoice.status}, billing_reason=${invoice.billing_reason}`);
        
        return hasAmount && isValidStatus && isNotDraft;
      })
      .map(invoice => {
        // Para faturas de upgrade com metadata, usar os valores do metadata
        // pois são os valores corretos calculados pela nossa lógica de prorrata
        let lineItems: { amount: number; description: string }[] = [];
        let creditAmount = 0;
        let chargeAmount = 0;
        
        // Verificar se é uma fatura de upgrade com metadata
        const isProrationUpgrade = invoice.metadata?.type === 'proration_upgrade';
        const metaCreditAmount = invoice.metadata?.credit_amount ? parseInt(invoice.metadata.credit_amount) : 0;
        const metaFinalAmount = invoice.metadata?.final_amount ? parseInt(invoice.metadata.final_amount) : 0;
        const metaNewPlanPrice = invoice.metadata?.new_plan_price ? parseInt(invoice.metadata.new_plan_price) : 0;
        
        if (invoice.lines?.data) {
          for (const line of invoice.lines.data) {
            lineItems.push({
              amount: line.amount,
              description: line.description || ''
            });
            if (line.amount < 0) {
              creditAmount += Math.abs(line.amount);
            } else {
              chargeAmount += line.amount;
            }
          }
        }
        
        // Usar valores do metadata se disponíveis (mais precisos)
        if (isProrationUpgrade && metaCreditAmount > 0) {
          creditAmount = metaCreditAmount;
        }
        
        // O valor efetivamente cobrado
        // Para faturas de upgrade com metadata, usar o valor do metadata
        let effectiveAmountPaid = invoice.amount_paid;
        if (isProrationUpgrade && metaFinalAmount > 0) {
          effectiveAmountPaid = metaFinalAmount;
        }
        
        // Criar descrição clara para upgrades
        let description = invoice.description || invoice.lines?.data?.[0]?.description || null;
        
        // Para faturas de upgrade com metadata, criar descrição melhor
        if (isProrationUpgrade) {
          const toPlanName = invoice.metadata?.to_plan_name || invoice.metadata?.to_plan || 'novo plano';
          const displayPlanName = toPlanName
            .replace('TherapyPro ', '')
            .replace('Monthly', 'Mensal')
            .replace('Yearly', 'Anual');
          
          if (metaCreditAmount > 0) {
            description = `Upgrade para ${displayPlanName} - Crédito de R$ ${(metaCreditAmount / 100).toFixed(2).replace('.', ',')} aplicado`;
          } else {
            description = `Upgrade para ${displayPlanName}`;
          }
        } else if (invoice.billing_reason === 'subscription_update' && creditAmount > 0) {
          // Fallback para faturas antigas sem metadata
          const planLine = invoice.lines?.data?.find(l => l.amount > 0);
          const planMatch = planLine?.description?.match(/(.+?)\s*\(at/i) || planLine?.description?.match(/remaining time on (.+)/i);
          let planName = planMatch ? planMatch[1].trim() : 'novo plano';
          planName = planName
            .replace('TherapyPro ', '')
            .replace('Remaining time on ', '')
            .replace('Monthly', 'Mensal')
            .replace('Yearly', 'Anual')
            .replace('Premium', 'Premium')
            .replace('Profissional', 'Profissional');
          
          description = `Upgrade para ${planName} - Crédito de R$ ${(creditAmount / 100).toFixed(2).replace('.', ',')} aplicado`;
        }
        
        console.log(`[get-subscription-invoices] 📄 Formatted invoice ${invoice.number}: isProration=${isProrationUpgrade}, metaFinal=${metaFinalAmount}, amountPaid=${invoice.amount_paid}, effectiveAmount=${effectiveAmountPaid}`);
        
        return {
          id: invoice.id,
          number: invoice.number,
          amount_paid: effectiveAmountPaid, // Valor efetivamente cobrado (do metadata se disponível)
          amount_due: invoice.amount_due,
          total: invoice.total,
          credit_amount: creditAmount, // Crédito aplicado
          charge_amount: chargeAmount, // Valor bruto antes do crédito
          currency: invoice.currency,
          status: invoice.status,
          created: invoice.created,
          period_start: invoice.period_start,
          period_end: invoice.period_end,
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          subscription_id: invoice.subscription,
          billing_reason: invoice.billing_reason,
          description: description
        };
      });

    console.log('[get-subscription-invoices] ✅ Filtered invoices count:', formattedInvoices.length);

    return new Response(JSON.stringify({ 
      invoices: formattedInvoices,
      subscription: subscriptionInfo,
      currentPlan: profile.subscription_plan || 'basico'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[get-subscription-invoices] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
