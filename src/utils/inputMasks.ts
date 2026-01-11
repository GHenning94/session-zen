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
  // Sempre preservar o valor original para permitir colar
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
  
  // TELEFONE: começa com + OU tem 10-13 dígitos (mas não é CPF válido)
  if (trimmed.startsWith('+') || onlyNumbers.length >= 10) {
    let digits = onlyNumbers;
    
    // Se tem 10-11 dígitos (telefone sem código país), adicionar 55
    if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('55')) {
      digits = '55' + digits;
    }
    
    // Limitar a 13 dígitos
    digits = digits.slice(0, 13);
    
    // Formatar como telefone: +55 (XX) XXXXX-XXXX
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
  
  // DURANTE DIGITAÇÃO: menos de 10 dígitos, só retorna os números
  // Isso permite digitar CPF sem formatação prematura
  if (onlyNumbers.length < 10) {
    return onlyNumbers;
  }
  
  // Fallback
  return value.slice(0, 36);
};
