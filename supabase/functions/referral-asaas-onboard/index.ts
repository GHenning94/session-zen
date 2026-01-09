import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[referral-asaas-onboard] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox";

    if (!asaasApiKey) {
      throw new Error("ASAAS_API_KEY not configured");
    }

    const asaasBaseUrl = asaasEnv === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

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

    // Verificar se já tem conta Asaas
    const { data: existingAccount } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let asaasWalletId: string;
    let asaasAccountId: string;

    if (existingAccount?.asaas_account_id) {
      asaasWalletId = existingAccount.wallet_id;
      asaasAccountId = existingAccount.asaas_account_id;
      logStep("Using existing Asaas account", { asaasAccountId, asaasWalletId });
      
      return new Response(JSON.stringify({
        success: true,
        already_onboarded: true,
        asaas_account_id: asaasAccountId,
        wallet_id: asaasWalletId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar dados do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, telefone, cpf_cnpj, banco, agencia, conta, tipo_conta, chave_pix')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Verificar se tem dados bancários para receber
    if (!profile.chave_pix && (!profile.banco || !profile.agencia || !profile.conta)) {
      throw new Error("Dados bancários incompletos. Configure sua chave PIX ou dados bancários antes de continuar.");
    }

    // Criar subconta no Asaas
    const subaccountPayload: any = {
      name: profile.nome || 'Parceiro TherapyPro',
      email: user.email,
      cpfCnpj: profile.cpf_cnpj?.replace(/\D/g, ''),
      mobilePhone: profile.telefone?.replace(/\D/g, ''),
      companyType: 'MEI', // Assume MEI por padrão
      incomeValue: 5000, // Valor estimado
      address: 'Não informado',
      addressNumber: 'S/N',
      province: 'Centro',
      postalCode: '01001000', // CEP genérico
    };

    logStep("Creating Asaas subaccount", subaccountPayload);

    const subaccountResponse = await fetch(`${asaasBaseUrl}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify(subaccountPayload),
    });

    const subaccountResult = await subaccountResponse.json();

    if (subaccountResult.errors) {
      console.error('[referral-asaas-onboard] Error creating subaccount:', subaccountResult);
      throw new Error(subaccountResult.errors[0]?.description || "Erro ao criar subconta no Asaas");
    }

    asaasAccountId = subaccountResult.id;
    asaasWalletId = subaccountResult.walletId;

    logStep("Created Asaas subaccount", { asaasAccountId, asaasWalletId });

    // Salvar no banco de dados
    await supabase
      .from('asaas_subaccounts')
      .insert({
        user_id: user.id,
        asaas_account_id: asaasAccountId,
        wallet_id: asaasWalletId,
        account_status: 'active',
      });

    logStep("Saved Asaas account to database");

    return new Response(JSON.stringify({
      success: true,
      already_onboarded: false,
      asaas_account_id: asaasAccountId,
      wallet_id: asaasWalletId,
      message: 'Subconta Asaas criada com sucesso! Você já pode receber comissões automaticamente.',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[referral-asaas-onboard] Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
