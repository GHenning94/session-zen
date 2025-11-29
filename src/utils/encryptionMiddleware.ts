import { supabase } from '@/integrations/supabase/client';

/**
 * Sensitive fields configuration for frontend
 * Must match backend configuration
 */
export const SENSITIVE_FIELDS = {
  clients: ['historico', 'dados_clinicos', 'tratamento'],
  anamneses: [
    'motivo_consulta',
    'queixa_principal',
    'historico_familiar',
    'historico_medico',
    'antecedentes_relevantes',
    'diagnostico_inicial',
    'observacoes_adicionais'
  ],
  sessions: ['anotacoes'],
  session_notes: ['notes'],
  evolucoes: ['evolucao'],
  profiles: ['bio', 'banco', 'agencia', 'conta', 'cpf_cnpj'],
  configuracoes: ['chave_pix', 'dados_bancarios'],
  packages: ['observacoes'],
  payments: ['observacoes']
} as const;

/**
 * Check if a field should be encrypted
 */
export function isSensitiveField(table: string, field: string): boolean {
  const fields = SENSITIVE_FIELDS[table as keyof typeof SENSITIVE_FIELDS];
  return fields ? (fields as readonly string[]).includes(field) : false;
}

/**
 * Get sensitive fields for a table
 */
export function getSensitiveFields(table: string): readonly string[] {
  return SENSITIVE_FIELDS[table as keyof typeof SENSITIVE_FIELDS] || [];
}

/**
 * Encrypt sensitive data using backend edge function
 */
export async function encryptSensitiveData(
  table: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  try {
    const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
      body: {
        table,
        data,
        operation: 'encrypt'
      }
    });

    if (error) {
      console.error('[Encryption] Failed to encrypt data:', error);
      return data; // Return original data if encryption fails
    }

    return result.data;
  } catch (error) {
    console.error('[Encryption] Error calling encrypt-data function:', error);
    return data; // Return original data if call fails
  }
}

/**
 * Decrypt sensitive data using backend edge function
 */
export async function decryptSensitiveData(
  table: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  try {
    const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
      body: {
        table,
        data,
        operation: 'decrypt'
      }
    });

    if (error) {
      console.error('[Encryption] Failed to decrypt data:', error);
      return data; // Return original data if decryption fails
    }

    return result.data;
  } catch (error) {
    console.error('[Encryption] Error calling encrypt-data function:', error);
    return data; // Return original data if call fails
  }
}

/**
 * Sanitize logs by masking sensitive fields
 */
export function safeLog(
  message: string,
  data: Record<string, any>,
  table?: string
): void {
  if (!table) {
    console.log(message, '[DATA HIDDEN]');
    return;
  }

  const sensitiveFields = getSensitiveFields(table);
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[ENCRYPTED]';
    }
  }

  console.log(message, sanitized);
}
