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

// Detecta o tipo de chave PIX e aplica formatação automática
export const formatPixKey = (value: string): string => {
  // Remove espaços extras
  const trimmed = value.trim();
  
  // Se está vazio, retorna vazio
  if (!trimmed) return '';
  
  // Verifica se é um email (contém @)
  if (trimmed.includes('@')) {
    // Email: não formata, apenas limita tamanho
    return trimmed.slice(0, 77).toLowerCase();
  }
  
  // Remove todos os caracteres não numéricos para verificar se é número
  const onlyNumbers = trimmed.replace(/\D/g, '');
  
  // Se só tem números
  if (onlyNumbers.length > 0 && trimmed.replace(/[\d\s\-().+/]/g, '').length === 0) {
    // Telefone: começa com +55 ou tem 10-11 dígitos
    if (trimmed.startsWith('+') || (onlyNumbers.length >= 10 && onlyNumbers.length <= 13)) {
      // Formato telefone: +55 (XX) XXXXX-XXXX
      let digits = onlyNumbers;
      
      // Se não começou com 55, adiciona
      if (!digits.startsWith('55') && digits.length <= 11) {
        digits = '55' + digits;
      }
      
      // Limita a 13 dígitos (55 + DDD + 9 dígitos)
      digits = digits.slice(0, 13);
      
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
    
    // CPF: 11 dígitos
    if (onlyNumbers.length <= 11) {
      return formatCPF(onlyNumbers);
    }
    
    // CNPJ: 14 dígitos
    if (onlyNumbers.length <= 14) {
      return formatCNPJ(onlyNumbers);
    }
  }
  
  // Chave aleatória ou formato não reconhecido
  // Limita a 36 caracteres (tamanho padrão de UUID)
  return trimmed.slice(0, 36);
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
  
  // Telefone (começa com + ou tem formato de telefone)
  if (trimmed.startsWith('+')) {
    return 'phone';
  }
  
  const onlyNumbers = trimmed.replace(/\D/g, '');
  
  // Telefone com 10-13 dígitos
  if (onlyNumbers.length >= 10 && onlyNumbers.length <= 13 && !trimmed.includes('.')) {
    return 'phone';
  }
  
  // CPF: 11 dígitos
  if (onlyNumbers.length === 11 && validateCPF(onlyNumbers)) {
    return 'cpf';
  }
  
  // CNPJ: 14 dígitos
  if (onlyNumbers.length === 14 && validateCNPJ(onlyNumbers)) {
    return 'cnpj';
  }
  
  // Chave aleatória (UUID format)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    return 'random';
  }
  
  return 'unknown';
};
