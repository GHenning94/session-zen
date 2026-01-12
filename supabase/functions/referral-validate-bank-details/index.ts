import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sensitive fields for profiles that need encryption
const SENSITIVE_PROFILE_FIELDS = ['banco', 'agencia', 'conta', 'cpf_cnpj', 'chave_pix', 'nome_titular'];

// Validate CPF
function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Validate CNPJ
function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { 
      tipo_pessoa, 
      cpf_cnpj, 
      nome_titular, 
      banco, 
      agencia, 
      conta, 
      tipo_conta,
      chave_pix 
    } = body;

    const errors: string[] = [];

    // Normalizar tipo_pessoa (aceitar ambos os formatos)
    let normalizedTipoPessoa = tipo_pessoa;
    if (tipo_pessoa === 'fisica') normalizedTipoPessoa = 'PF';
    if (tipo_pessoa === 'juridica') normalizedTipoPessoa = 'PJ';

    // Validate tipo_pessoa
    if (!normalizedTipoPessoa || !['PF', 'PJ'].includes(normalizedTipoPessoa)) {
      errors.push("Tipo de pessoa inválido");
    }

    // Validate CPF/CNPJ
    if (!cpf_cnpj) {
      errors.push("CPF/CNPJ é obrigatório");
    } else {
      const cleanDoc = cpf_cnpj.replace(/[^\d]/g, '');
      if (normalizedTipoPessoa === 'PF') {
        if (!validateCPF(cleanDoc)) {
          errors.push("CPF inválido");
        }
      } else if (normalizedTipoPessoa === 'PJ') {
        if (!validateCNPJ(cleanDoc)) {
          errors.push("CNPJ inválido");
        }
      }
    }

    // Validate nome_titular
    if (!nome_titular || nome_titular.trim().length < 3) {
      errors.push("Nome do titular inválido");
    }

    // Validate banco
    if (!banco || banco.trim().length < 2) {
      errors.push("Banco é obrigatório");
    }

    // Validate agencia
    if (!agencia || !/^\d{1,6}(-?\d)?$/.test(agencia.replace(/\s/g, ''))) {
      errors.push("Agência inválida");
    }

    // Validate conta
    if (!conta || !/^\d{3,13}(-?\d)?$/.test(conta.replace(/\s/g, ''))) {
      errors.push("Conta inválida");
    }

    // Validate tipo_conta
    if (!tipo_conta || !['corrente', 'poupanca'].includes(tipo_conta)) {
      errors.push("Tipo de conta inválido");
    }

    // Validate chave_pix format if provided
    if (chave_pix && chave_pix.trim()) {
      const cleanPix = chave_pix.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanPix);
      // Aceitar telefone formatado ou não formatado
      const cleanPhone = cleanPix.replace(/[\s()\-+]/g, '');
      const isPhone = /^(55)?\d{10,11}$/.test(cleanPhone);
      const isCPF = validateCPF(cleanPix.replace(/\D/g, ''));
      const isCNPJ = validateCNPJ(cleanPix.replace(/\D/g, ''));
      const isRandom = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanPix);
      // Aceitar qualquer chave aleatória com letras
      const isRandomGeneric = /[a-zA-Z]/.test(cleanPix) && !cleanPix.includes('@');

      if (!isEmail && !isPhone && !isCPF && !isCNPJ && !isRandom && !isRandomGeneric) {
        errors.push("Formato de chave PIX inválido");
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ valid: false, errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare data for encryption
    const bankData = {
      tipo_pessoa: normalizedTipoPessoa,
      cpf_cnpj: cpf_cnpj.replace(/[^\d]/g, ''),
      nome_titular: nome_titular.trim(),
      banco: banco.trim(),
      agencia: agencia.trim(),
      conta: conta.trim(),
      tipo_conta,
      chave_pix: chave_pix?.trim() || null,
      bank_details_validated: true,
      bank_details_updated_at: new Date().toISOString(),
    };

    // Encrypt sensitive fields before saving - CRITICAL: encryption is mandatory
    const encryptedData: Record<string, any> = { ...bankData };
    const encryptionErrors: string[] = [];
    
    for (const field of SENSITIVE_PROFILE_FIELDS) {
      if (encryptedData[field] && typeof encryptedData[field] === 'string') {
        try {
          encryptedData[field] = await encrypt(encryptedData[field]);
          console.log(`[referral-validate-bank-details] Encrypted field: ${field}`);
        } catch (encryptError) {
          console.error(`[referral-validate-bank-details] CRITICAL: Failed to encrypt ${field}:`, encryptError);
          encryptionErrors.push(field);
        }
      }
    }

    // If ANY encryption failed, do NOT save unencrypted data - this is a security requirement
    if (encryptionErrors.length > 0) {
      console.error(`[referral-validate-bank-details] SECURITY: Refusing to save unencrypted sensitive data. Failed fields: ${encryptionErrors.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: "Erro de segurança: não foi possível criptografar os dados bancários. Entre em contato com o suporte.",
          details: "Encryption system unavailable"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with encrypted data
    const { error: updateError } = await supabase
      .from("profiles")
      .update(encryptedData)
      .eq("user_id", user.id);

    if (updateError) {
      console.error('[referral-validate-bank-details] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar dados bancários" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[referral-validate-bank-details] Bank details validated, encrypted and saved for user:', user.id);

    return new Response(
      JSON.stringify({ success: true, valid: true, message: "Dados bancários validados e salvos com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[referral-validate-bank-details] Error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
