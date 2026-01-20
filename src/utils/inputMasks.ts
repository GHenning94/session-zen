export interface PhoneCountryConfig {
  /** Código do país em formato E.164, ex: +55, +1 */
  code: string;
  /** Rótulo exibido no dropdown, incluindo bandeira/nome */
  label: string;
  /** Exemplo exibido como placeholder */
  example: string;
}

/** Lista de países inspirada em grandes plataformas (WhatsApp, Google, etc.) */
export const PHONE_COUNTRIES: PhoneCountryConfig[] = [
  { code: "+55", label: "🇧🇷 Brasil (+55)", example: "(11) 3456-7890 ou (11) 98765-4321" },
  { code: "+351", label: "🇵🇹 Portugal (+351)", example: "912 345 678" },
  { code: "+1", label: "🇺🇸 EUA / 🇨🇦 Canadá (+1)", example: "415 555 1234" },
  { code: "+44", label: "🇬🇧 Reino Unido (+44)", example: "20 7123 4567" },
  { code: "+34", label: "🇪🇸 Espanha (+34)", example: "612 34 56 78" },
  { code: "+39", label: "🇮🇹 Itália (+39)", example: "312 345 6789" },
  { code: "+33", label: "🇫🇷 França (+33)", example: "06 12 34 56 78" },
  { code: "+49", label: "🇩🇪 Alemanha (+49)", example: "0151 23456789" },
  { code: "+41", label: "🇨🇭 Suíça (+41)", example: "079 123 45 67" },
  { code: "+972", label: "🇮🇱 Israel (+972)", example: "54 123 4567" },
  { code: "+54", label: "🇦🇷 Argentina (+54)", example: "11 2345 6789" },
  { code: "+56", label: "🇨🇱 Chile (+56)", example: "9 6123 4567" },
  { code: "+57", label: "🇨🇴 Colômbia (+57)", example: "321 123 4567" },
  { code: "+52", label: "🇲🇽 México (+52)", example: "55 1234 5678" },
];

export const DEFAULT_PHONE_COUNTRY = "+55";

// Regras detalhadas de comprimento e formatação por país (somente número nacional, sem código do país)
interface CountryPhoneRule {
  minDigits: number;
  maxDigits: number;
  format: (digits: string) => string;
}

const groupDigits = (digits: string, groups: number[]): string => {
  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= digits.length) break;
    const end = Math.min(index + size, digits.length);
    parts.push(digits.slice(index, end));
    index = end;
  }
  return parts.join(" ");
};

const COUNTRY_PHONE_RULES: Record<string, CountryPhoneRule> = {
  "+351": {
    // Portugal: 9 dígitos (ex.: 912 345 678 ou 212 345 678)
    minDigits: 9,
    maxDigits: 9,
    format: (d) => groupDigits(d, [3, 3, 3]),
  },
  "+1": {
    // EUA / Canadá: 10 dígitos (ex.: (415) 555-1234)
    minDigits: 10,
    maxDigits: 10,
    format: (d) => {
      if (d.length === 0) return "";
      if (d.length <= 3) return `(${d}`;
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    },
  },
  "+44": {
    // Reino Unido: 10–11 dígitos (varia por região)
    minDigits: 10,
    maxDigits: 11,
    format: (d) => {
      // Ex.: 20 7123 4567, 161 234 5678
      if (d.length <= 4) return d;
      if (d.length <= 7) return groupDigits(d, [4, d.length - 4]);
      return groupDigits(d, [2, 4, d.length - 6]);
    },
  },
  "+34": {
    // Espanha: 9 dígitos (ex.: 612 34 56 78)
    minDigits: 9,
    maxDigits: 9,
    format: (d) => groupDigits(d, [3, 2, 2, 2]),
  },
  "+39": {
    // Itália: geralmente 9–10 dígitos
    minDigits: 9,
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return groupDigits(d, [3, d.length - 3]);
      return groupDigits(d, [3, 3, d.length - 6]);
    },
  },
  "+33": {
    // França: 9–10 dígitos (ex.: 06 12 34 56 78)
    minDigits: 9,
    maxDigits: 10,
    format: (d) => {
      if (d.length <= 2) return d;
      return groupDigits(d, [2, 2, 2, 2, d.length - 8]);
    },
  },
  "+49": {
    // Alemanha: comprimento variável (7–13 dígitos)
    minDigits: 7,
    maxDigits: 13,
    format: (d) => {
      if (d.length <= 3) return d;
      if (d.length <= 7) return groupDigits(d, [3, d.length - 3]);
      return groupDigits(d, [3, 3, d.length - 6]);
    },
  },
  "+41": {
    // Suíça: 9 dígitos (ex.: 079 123 45 67)
    minDigits: 9,
    maxDigits: 9,
    format: (d) => groupDigits(d, [3, 3, 2, 2]),
  },
  "+972": {
    // Israel: 8–9 dígitos
    minDigits: 8,
    maxDigits: 9,
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 5) return groupDigits(d, [2, d.length - 2]);
      return groupDigits(d, [2, 3, d.length - 5]);
    },
  },
  "+54": {
    // Argentina: 10 dígitos (ex.: 11 2345 6789)
    minDigits: 10,
    maxDigits: 10,
    format: (d) => groupDigits(d, [2, 4, 4]),
  },
  "+56": {
    // Chile: 9 dígitos (ex.: 9 6123 4567)
    minDigits: 9,
    maxDigits: 9,
    format: (d) => groupDigits(d, [1, 4, 4]),
  },
  "+57": {
    // Colômbia: 10 dígitos
    minDigits: 10,
    maxDigits: 10,
    format: (d) => groupDigits(d, [3, 3, 4]),
  },
  "+52": {
    // México: 10 dígitos
    minDigits: 10,
    maxDigits: 10,
    format: (d) => groupDigits(d, [2, 4, 4]),
  },
};

/** Placeholder padrão de acordo com o país selecionado */
export const getPhonePlaceholder = (countryCode: string): string => {
  const cfg = PHONE_COUNTRIES.find(c => c.code === countryCode);
  if (cfg) return cfg.example;
  return "+00 0000 000 000";
};

/** Formatação de telefone considerando país (sem incluir o código do país no campo) */
export const formatInternationalPhone = (value: string, countryCode: string): string => {
  const digits = value.replace(/\D/g, "");

  // Brasil: manter padrão com/sem dígito 9
  if (countryCode === "+55") {
    const numbers = digits.slice(0, 11);
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) {
      // (DD) XXXX-XXXX
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    // (DD) 9XXXX-XXXX
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }

  const rule = COUNTRY_PHONE_RULES[countryCode];
  if (rule) {
    const limited = digits.slice(0, rule.maxDigits);
    if (!limited) return "";
    return rule.format(limited);
  }

  // Fallback genérico (país não configurado): apenas agrupar em blocos de 3–3–3...
  const generic = digits.slice(0, 15);
  if (!generic) return "";
  return groupDigits(generic, [3, 3, 3, 3, 3]);
};

/** Normaliza telefone removendo formatação, retornando apenas dígitos */
export const normalizePhoneDigits = (value: string): string => {
  return value.replace(/\D/g, "");
};

/** Validação de telefone baseada em padrões amplamente usados (E.164 simplificado) */
export const isValidInternationalPhone = (value: string, countryCode: string): boolean => {
  const numbers = normalizePhoneDigits(value);

  if (!numbers) return false;

  // Brasil: aceitar DDD + 8 dígitos (fixo) OU DDD + 9 dígitos (celular)
  if (countryCode === "+55") {
    return numbers.length === 10 || numbers.length === 11;
  }

  const rule = COUNTRY_PHONE_RULES[countryCode];
  if (rule) {
    return numbers.length >= rule.minDigits && numbers.length <= rule.maxDigits;
  }

  // Demais países (não configurados): regra genérica 6–15 dígitos (E.164)
  return numbers.length >= 6 && numbers.length <= 15;
};

// Mantido por compatibilidade em pontos que ainda usam apenas formato brasileiro
export const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

export const formatCRP = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{5})/, '$1/$2');
};

export const formatCRM = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  // CRM format: 000000-UF (6 digits + state)
  if (cleaned.length <= 6) {
    return cleaned;
  }
  return cleaned.replace(/(\d{6})(\d{0,2})/, '$1-$2');
};

export const formatCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  return cleaned
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

export const formatCPFCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 11) {
    return formatCPF(cleaned);
  }
  return formatCNPJ(cleaned);
};

export const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(cleaned[10])) return false;
  
  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validate first digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cleaned[12])) return false;
  
  // Validate second digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cleaned[13])) return false;
  
  return true;
};

export const validateCPFCNPJ = (value: string): boolean => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) return validateCPF(cleaned);
  if (cleaned.length === 14) return validateCNPJ(cleaned);
  return false;
};

export const validatePassword = (password: string): boolean => {
  const requirements = [
    { test: (pwd: string) => pwd.length >= 8 },
    { test: (pwd: string) => /[A-Z]/.test(pwd) },
    { test: (pwd: string) => /[a-z]/.test(pwd) },
    { test: (pwd: string) => /\d/.test(pwd) },
    { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ];
  return requirements.every(req => req.test(password));
};

// Detecta o tipo de chave PIX
export type PixKeyType = 'email' | 'phone' | 'cpf' | 'cnpj' | 'random' | 'unknown';

export const detectPixKeyType = (value: string): PixKeyType => {
  if (!value || !value.trim()) return 'unknown';
  
  const trimmed = value.trim();
  
  // Email
  if (trimmed.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'email';
  }
  
  // Chave aleatória (UUID format)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    return 'random';
  }
  
  // Se contém letras (exceto email), é chave aleatória
  if (/[a-zA-Z]/.test(trimmed) && !trimmed.includes('@')) {
    return 'random';
  }
  
  const onlyNumbers = trimmed.replace(/\D/g, '');
  
  // CPF: exatamente 11 dígitos e válido
  if (onlyNumbers.length === 11 && validateCPF(onlyNumbers)) {
    return 'cpf';
  }
  
  // CNPJ: exatamente 14 dígitos e válido
  if (onlyNumbers.length === 14 && validateCNPJ(onlyNumbers)) {
    return 'cnpj';
  }
  
  // Telefone: começa com + ou tem formato específico de telefone
  // Telefone brasileiro com código país: 55 + DDD(2) + número(8-9) = 12-13 dígitos
  if (trimmed.startsWith('+')) {
    return 'phone';
  }
  
  // 12-13 dígitos é definitivamente telefone (com código país)
  if (onlyNumbers.length >= 12 && onlyNumbers.length <= 13) {
    return 'phone';
  }
  
  // 10-11 dígitos: pode ser telefone ou CPF inválido
  // Se 11 dígitos mas CPF inválido, assume telefone
  if (onlyNumbers.length === 11 && !validateCPF(onlyNumbers)) {
    return 'phone';
  }
  
  // 10 dígitos é telefone fixo
  if (onlyNumbers.length === 10) {
    return 'phone';
  }
  
  return 'unknown';
};

// Detecta o tipo de chave PIX e aplica formatação automática
// IMPORTANTE: Esta função NÃO deve bloquear entrada de texto
export const formatPixKey = (value: string): string => {
  if (!value) return '';
  
  const trimmed = value.trim();
  if (!trimmed) return '';
  
  // EMAIL: contém @, apenas lowercase e limitar tamanho
  if (trimmed.includes('@')) {
    return trimmed.slice(0, 77).toLowerCase();
  }
  
  // CHAVE ALEATÓRIA: contém letras (não é email)
  // Preservar EXATAMENTE como foi digitado/colado
  if (/[a-zA-Z]/.test(trimmed)) {
    return value.slice(0, 36);
  }
  
  // TELEFONE EXPLÍCITO: começa com +
  // Só formata como telefone se o usuário explicitamente começou com +
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '').slice(0, 13);
    
    if (digits.length <= 2) {
      return '+' + digits;
    } else if (digits.length <= 4) {
      return '+' + digits.slice(0, 2) + ' (' + digits.slice(2);
    } else if (digits.length <= 9) {
      return '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 4) + ') ' + digits.slice(4);
    } else {
      const phoneDigits = digits.slice(4);
      if (phoneDigits.length <= 4) {
        return '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 4) + ') ' + phoneDigits;
      } else {
        return '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 4) + ') ' + phoneDigits.slice(0, 5) + '-' + phoneDigits.slice(5, 9);
      }
    }
  }
  
  // A partir daqui só temos números e possíveis caracteres de formatação
  const onlyNumbers = trimmed.replace(/\D/g, '');
  
  // Se não tem números, preservar o valor
  if (onlyNumbers.length === 0) {
    return value.slice(0, 36);
  }
  
  // CPF: exatamente 11 dígitos E CPF válido
  if (onlyNumbers.length === 11 && validateCPF(onlyNumbers)) {
    return formatCPF(onlyNumbers);
  }
  
  // CNPJ: exatamente 14 dígitos
  if (onlyNumbers.length === 14) {
    return formatCNPJ(onlyNumbers);
  }
  
  // DURANTE DIGITAÇÃO: NÃO assumir que é telefone
  // Apenas retornar os números limpos, sem formatação prematura
  // Isso permite que o usuário digite CPF (11 dígitos) sem ser formatado como telefone
  return onlyNumbers.slice(0, 14);
};
