import { supabase } from '@/integrations/supabase/client';
import { decryptSensitiveData } from './encryptionMiddleware';

/**
 * Utilitário para buscar e descriptografar dados de forma segura
 * Centraliza a lógica de descriptografia para evitar dados criptografados sendo exibidos
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
 * Busca e descriptografa lista de clientes
 */
export async function fetchDecryptedClients(userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data) return [];
  
  // Descriptografar cada cliente
  const decryptedClients = await Promise.all(
    data.map(client => decryptSensitiveData('clients', client))
  );
  
  return decryptedClients;
}

/**
 * Busca e descriptografa anamneses
 */
export async function fetchDecryptedAnamneses(userId: string) {
  const { data, error } = await supabase
    .from('anamneses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data) return [];
  
  // Descriptografar cada anamnese
  const decryptedAnamneses = await Promise.all(
    data.map(anamnese => decryptSensitiveData('anamneses', anamnese))
  );
  
  return decryptedAnamneses;
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
 * Busca e descriptografa evoluções
 */
export async function fetchDecryptedEvolucoes(userId: string) {
  const { data, error } = await supabase
    .from('evolucoes')
    .select('*')
    .eq('user_id', userId)
    .order('data_sessao', { ascending: false });
  
  if (error) throw error;
  if (!data) return [];
  
  // Descriptografar cada evolução
  const decryptedEvolucoes = await Promise.all(
    data.map(evolucao => decryptSensitiveData('evolucoes', evolucao))
  );
  
  return decryptedEvolucoes;
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
 * Busca e descriptografa notas de sessão
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
  if (!data) return [];
  
  // Descriptografar cada nota
  const decryptedNotes = await Promise.all(
    data.map(note => decryptSensitiveData('session_notes', note))
  );
  
  return decryptedNotes;
}

/**
 * Busca e descriptografa sessões com anotações
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
  if (!data) return [];
  
  // Descriptografar cada sessão
  const decryptedSessions = await Promise.all(
    data.map(session => decryptSensitiveData('sessions', session))
  );
  
  return decryptedSessions;
}

/**
 * Busca e descriptografa pacotes
 */
export async function fetchDecryptedPackages(userId: string) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data) return [];
  
  // Descriptografar cada pacote
  const decryptedPackages = await Promise.all(
    data.map(pkg => decryptSensitiveData('packages', pkg))
  );
  
  return decryptedPackages;
}

/**
 * Busca e descriptografa pagamentos
 */
export async function fetchDecryptedPayments(userId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data) return [];
  
  // Descriptografar cada pagamento
  const decryptedPayments = await Promise.all(
    data.map(payment => decryptSensitiveData('payments', payment))
  );
  
  return decryptedPayments;
}

/**
 * Descriptografa um array de dados de uma tabela específica
 */
export async function decryptDataArray<T extends Record<string, any>>(
  table: string,
  data: T[]
): Promise<T[]> {
  if (!data || data.length === 0) return [];
  
  return Promise.all(
    data.map(item => decryptSensitiveData(table, item) as Promise<T>)
  );
}
