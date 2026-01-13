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
  profiles: ['bio', 'banco', 'agencia', 'conta', 'cpf_cnpj', 'chave_pix', 'nome_titular'],
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
 * Check if a value appears to be encrypted (base64 with length > 40)
 */
function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(value) && value.length > 40;
}

/**
 * Decrypt locally if backend fails - fallback to showing original value
 * This prevents showing encrypted gibberish to users
 */
function handleDecryptionFallback(
  table: string,
  data: Record<string, any>
): Record<string, any> {
  const sensitiveFields = getSensitiveFields(table);
  const result = { ...data };
  
  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string' && isEncrypted(result[field])) {
      // If the value is encrypted and we can't decrypt it, show a placeholder
      // This is better than showing encrypted gibberish
      console.warn(`[Encryption] Field ${field} appears encrypted but decryption failed`);
      result[field] = '[Dados protegidos - recarregue a página]';
    }
  }
  
  return result;
}

/**
 * Encrypt sensitive data using backend edge function
 */
export async function encryptSensitiveData(
  table: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  try {
    // Get current session to ensure we have auth
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      console.error('[Encryption] No active session for encryption');
      return data;
    }

    const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
      body: {
        table,
        data,
        operation: 'encrypt'
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
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
    // Get current session to ensure we have auth
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      console.error('[Encryption] No active session for decryption');
      return handleDecryptionFallback(table, data);
    }

    const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
      body: {
        table,
        data,
        operation: 'decrypt'
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error) {
      console.error('[Encryption] Failed to decrypt data:', error);
      return handleDecryptionFallback(table, data);
    }

    if (!result?.data) {
      console.error('[Encryption] Invalid response from decrypt function');
      return handleDecryptionFallback(table, data);
    }

    return result.data;
  } catch (error) {
    console.error('[Encryption] Error calling encrypt-data function:', error);
    return handleDecryptionFallback(table, data);
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
