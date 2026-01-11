/**
 * Sensitive Fields Configuration
 * 
 * Defines which fields should be encrypted in each table.
 * These fields contain sensitive or confidential information.
 */

export const SENSITIVE_FIELDS = {
  // Client medical and personal data
  clients: [
    'historico',
    'dados_clinicos',
    'tratamento'
  ],
  
  // Anamnesis detailed medical information
  anamneses: [
    'motivo_consulta',
    'queixa_principal',
    'historico_familiar',
    'historico_medico',
    'antecedentes_relevantes',
    'diagnostico_inicial',
    'observacoes_adicionais'
  ],
  
  // Session notes and annotations
  sessions: [
    'anotacoes'
  ],
  
  // Dedicated session notes
  session_notes: [
    'notes'
  ],
  
  // Evolution records
  evolucoes: [
    'evolucao'
  ],
  
  // Professional profile sensitive data
  profiles: [
    'bio',
    'banco',
    'agencia',
    'conta',
    'cpf_cnpj',
    'chave_pix',
    'nome_titular'
  ],
  
  // Configuration sensitive data
  configuracoes: [
    'chave_pix',
    'dados_bancarios'
  ],
  
  // Package observations
  packages: [
    'observacoes'
  ],
  
  // Payment observations
  payments: [
    'observacoes'
  ]
} as const;

/**
 * Check if a field should be encrypted for a given table
 * @param table - Table name
 * @param field - Field name
 * @returns True if field should be encrypted
 */
export function isSensitiveField(table: string, field: string): boolean {
  const fields = SENSITIVE_FIELDS[table as keyof typeof SENSITIVE_FIELDS];
  return fields ? fields.includes(field as any) : false;
}

/**
 * Get all sensitive fields for a table
 * @param table - Table name
 * @returns Array of sensitive field names
 */
export function getSensitiveFields(table: string): string[] {
  return SENSITIVE_FIELDS[table as keyof typeof SENSITIVE_FIELDS] || [];
}

/**
 * Get all tables that have sensitive fields
 * @returns Array of table names
 */
export function getTablesWithSensitiveFields(): string[] {
  return Object.keys(SENSITIVE_FIELDS);
}
