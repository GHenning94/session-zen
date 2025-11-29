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
