import { supabase } from '@/integrations/supabase/client';
import { decryptSensitiveData, decryptSensitiveDataBatch } from './encryptionMiddleware';

/**
 * Utilitário para buscar e descriptografar dados de forma segura
 * Centraliza a lógica de descriptografia para evitar dados criptografados sendo exibidos
 * Usa batch decryption para arrays (muito mais rápido)
 */

/**
 * Busca e descriptografa dados do perfil do usuário
 */
export async function fetchDecryptedProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  if (!data) return null;
  
  return await decryptSensitiveData('profiles', data);
}

/**
 * Busca e descriptografa configurações do usuário
 */
export async function fetchDecryptedConfiguracoes(userId: string) {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  
  return await decryptSensitiveData('configuracoes', data);
}

/**
 * Busca e descriptografa dados de um cliente específico
 */
export async function fetchDecryptedClient(clientId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  
  if (error) throw error;
  if (!data) return null;
  
  return await decryptSensitiveData('clients', data);
}

/**
 * Busca e descriptografa lista de clientes (usando batch)
 */
export async function fetchDecryptedClients(userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption - uma única chamada para todos os clientes
  return await decryptSensitiveDataBatch('clients', data);
}

/**
 * Busca e descriptografa anamneses (usando batch)
 */
export async function fetchDecryptedAnamneses(userId: string) {
  const { data, error } = await supabase
    .from('anamneses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption
  return await decryptSensitiveDataBatch('anamneses', data);
}

/**
 * Busca e descriptografa uma anamnese específica
 */
export async function fetchDecryptedAnamnese(anamneseId: string) {
  const { data, error } = await supabase
    .from('anamneses')
    .select('*')
    .eq('id', anamneseId)
    .single();
  
  if (error) throw error;
  if (!data) return null;
  
  return await decryptSensitiveData('anamneses', data);
}

/**
 * Busca e descriptografa evoluções (usando batch)
 */
export async function fetchDecryptedEvolucoes(userId: string) {
  const { data, error } = await supabase
    .from('evolucoes')
    .select('*')
    .eq('user_id', userId)
    .order('data_sessao', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption
  return await decryptSensitiveDataBatch('evolucoes', data);
}

/**
 * Busca e descriptografa uma evolução específica
 */
export async function fetchDecryptedEvolucao(evolucaoId: string) {
  const { data, error } = await supabase
    .from('evolucoes')
    .select('*')
    .eq('id', evolucaoId)
    .single();
  
  if (error) throw error;
  if (!data) return null;
  
  return await decryptSensitiveData('evolucoes', data);
}

/**
 * Busca e descriptografa notas de sessão (usando batch)
 */
export async function fetchDecryptedSessionNotes(userId: string) {
  const { data, error } = await supabase
    .from('session_notes')
    .select(`
      id, notes, created_at, session_id, client_id, is_private,
      clients (nome, avatar_url),
      sessions (data, horario, status)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption
  return await decryptSensitiveDataBatch('session_notes', data);
}

/**
 * Busca e descriptografa sessões com anotações (usando batch)
 */
export async function fetchDecryptedSessions(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id, data, horario, status, valor, anotacoes, client_id, package_id, recurring_session_id,
      metodo_pagamento, session_type, google_event_id, google_sync_type, created_at, updated_at,
      clients (nome, ativo, avatar_url),
      packages:package_id (nome, metodo_pagamento),
      recurring_sessions:recurring_session_id (metodo_pagamento)
    `)
    .eq('user_id', userId)
    .order('data', { ascending: false })
    .order('horario', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption
  return await decryptSensitiveDataBatch('sessions', data);
}

/**
 * Busca e descriptografa pacotes (usando batch)
 */
export async function fetchDecryptedPackages(userId: string) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption
  return await decryptSensitiveDataBatch('packages', data);
}

/**
 * Busca e descriptografa pagamentos (usando batch)
 */
export async function fetchDecryptedPayments(userId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // Usar batch decryption
  return await decryptSensitiveDataBatch('payments', data);
}

/**
 * Descriptografa um array de dados de uma tabela específica (usando batch)
 */
export async function decryptDataArray<T extends Record<string, any>>(
  table: string,
  data: T[]
): Promise<T[]> {
  if (!data || data.length === 0) return [];
  
  return await decryptSensitiveDataBatch(table, data);
}
