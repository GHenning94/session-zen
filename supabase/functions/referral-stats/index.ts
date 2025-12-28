import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[referral-stats] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) throw new Error("Authentication failed");
    logStep("User authenticated", { userId: user.id });

    // Buscar referrals do usuário
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', user.id);

    // Buscar payouts do usuário
    const { data: payouts } = await supabase
      .from('referral_payouts')
      .select('*')
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false });

    // Calcular estatísticas
    const totalReferrals = referrals?.length || 0;
    const activeReferrals = referrals?.filter(r => r.status === 'active' || r.status === 'converted').length || 0;
    const premiumReferrals = referrals?.filter(r => r.subscription_plan === 'premium').length || 0;
    const proReferrals = referrals?.filter(r => r.subscription_plan === 'pro').length || 0;
    const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;

    // Calcular ganhos
    const totalEarned = payouts?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const pendingEarnings = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Agrupar payouts por mês para histórico
    const payoutsByMonth: Record<string, { amount: number; count: number }> = {};
    payouts?.filter(p => p.status === 'paid' && p.paid_at).forEach(payout => {
      const date = new Date(payout.paid_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!payoutsByMonth[key]) {
        payoutsByMonth[key] = { amount: 0, count: 0 };
      }
      payoutsByMonth[key].amount += payout.amount;
      payoutsByMonth[key].count += 1;
    });

    // Converter para array ordenado
    const monthlyHistory = Object.entries(payoutsByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12); // Últimos 12 meses

    // Buscar detalhes dos payouts recentes com informações do indicado
    const recentPayouts = payouts?.slice(0, 10).map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      referred_user_name: p.referred_user_name,
      referred_plan: p.referred_plan,
      period_start: p.period_start,
      period_end: p.period_end,
      paid_at: p.paid_at,
      created_at: p.created_at,
    })) || [];

    logStep("Computed stats", {
      totalReferrals,
      activeReferrals,
      totalEarned,
    });

    return new Response(JSON.stringify({
      success: true,
      stats: {
        total_referrals: totalReferrals,
        active_referrals: activeReferrals,
        pending_referrals: pendingReferrals,
        premium_referrals: premiumReferrals,
        pro_referrals: proReferrals,
        total_earned: totalEarned, // em centavos
        pending_earnings: pendingEarnings, // em centavos
      },
      monthly_history: monthlyHistory,
      recent_payouts: recentPayouts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[referral-stats] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
