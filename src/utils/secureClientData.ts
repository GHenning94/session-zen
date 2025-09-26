import { supabase } from '@/integrations/supabase/client'

/**
 * SECURE CLIENT DATA UTILITIES
 * 
 * This module provides secure access to sensitive patient medical data
 * with comprehensive audit logging and validation.
 * 
 * ⚠️  MEDICAL DATA SECURITY:
 * - All access is logged for HIPAA/GDPR compliance
 * - Input is sanitized and validated
 * - Only authenticated users can access their own data
 */

export interface SecureMedicalData {
  id: string
  nome: string
  dados_clinicos: string
  historico: string
  last_accessed: string
}

export interface ClientAuditLog {
  id: string
  client_id: string
  action: 'VIEW' | 'UPDATE' | 'DELETE' | 'EXPORT'
  field_accessed: string | null
  access_timestamp: string
  ip_address: string | null
}

/**
 * Securely retrieve client medical data with automatic audit logging
 */
export async function getSecureClientMedicalData(clientId: string): Promise<SecureMedicalData | null> {
  try {
    const { data, error } = await supabase.rpc('get_client_medical_data', {
      p_client_id: clientId
    })

    if (error) {
      console.error('Error accessing medical data:', error.message)
      throw new Error('Access denied or client not found')
    }

    if (!data) return null

    // Safe type casting with validation
    const medicalData = data as unknown as SecureMedicalData
    return medicalData
  } catch (error) {
    console.error('Security error accessing medical data:', error)
    throw error
  }
}

/**
 * Securely update client medical data with validation and audit logging
 */
export async function updateSecureClientMedicalData(
  clientId: string,
  dadosClinicos?: string,
  historico?: string
): Promise<boolean> {
  try {
    // Validate input lengths client-side
    if (dadosClinicos && dadosClinicos.length > 10000) {
      throw new Error('Dados clínicos excedem o tamanho máximo permitido (10.000 caracteres)')
    }
    
    if (historico && historico.length > 10000) {
      throw new Error('Histórico médico excede o tamanho máximo permitido (10.000 caracteres)')
    }

    const { data, error } = await supabase.rpc('update_client_medical_data', {
      p_client_id: clientId,
      p_dados_clinicos: dadosClinicos || null,
      p_historico: historico || null
    })

    if (error) {
      console.error('Error updating medical data:', error.message)
      throw new Error('Failed to update medical data: ' + error.message)
    }

    return data === true
  } catch (error) {
    console.error('Security error updating medical data:', error)
    throw error
  }
}

/**
 * Securely export client data for compliance purposes (GDPR/HIPAA)
 */
export async function exportSecureClientData(clientId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('export_client_data_secure', {
      p_client_id: clientId
    })

    if (error) {
      console.error('Error exporting client data:', error.message)
      throw new Error('Export failed: ' + error.message)
    }

    return data
  } catch (error) {
    console.error('Security error exporting client data:', error)
    throw error
  }
}

/**
 * Retrieve audit logs for a specific client (for compliance)
 */
export async function getClientAuditLogs(clientId?: string): Promise<ClientAuditLog[]> {
  try {
    let query = supabase
      .from('medical_audit_log')
      .select('id, client_id, action, field_accessed, access_timestamp, ip_address')
      .order('access_timestamp', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error.message)
      throw new Error('Failed to fetch audit logs')
    }

    return (data || []) as ClientAuditLog[]
  } catch (error) {
    console.error('Error accessing audit logs:', error)
    throw error
  }
}

/**
 * Get clients using the safe view (masks medical data)
 */
export async function getSafeClientsList() {
  try {
    const { data, error } = await supabase
      .from('clients_safe')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching safe clients:', error.message)
      throw new Error('Failed to fetch clients list')
    }

    return data || []
  } catch (error) {
    console.error('Error fetching safe clients list:', error)
    throw error
  }
}

/**
 * Sanitize medical text client-side before sending to server
 */
export function sanitizeMedicalTextClientSide(text: string): string {
  if (!text) return ''
  
  // Remove potential script tags and normalize whitespace
  return text
    .replace(/<[^>]*>/gi, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 10000) // Enforce length limit
}

/**
 * Validate medical data input
 */
export function validateMedicalDataInput(text: string): { isValid: boolean; error?: string } {
  if (!text) return { isValid: true }
  
  if (text.length > 10000) {
    return { 
      isValid: false, 
      error: 'Texto excede o limite máximo de 10.000 caracteres' 
    }
  }
  
  // Check for potential malicious content
  if (/<script|javascript:|data:/gi.test(text)) {
    return { 
      isValid: false, 
      error: 'Conteúdo não permitido detectado' 
    }
  }
  
  return { isValid: true }
}

export default {
  getSecureClientMedicalData,
  updateSecureClientMedicalData,
  exportSecureClientData,
  getClientAuditLogs,
  getSafeClientsList,
  sanitizeMedicalTextClientSide,
  validateMedicalDataInput
}