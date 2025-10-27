import { supabase } from '@/integrations/supabase/client';

/**
 * Limpa completamente qualquer vestígio de sessão e redireciona para landing
 */
export const cleanupInvalidSession = async (reason: string = 'Sessão inválida') => {
  console.warn('🧹 Limpando sessão inválida:', reason);
  
  // 1. Limpar localStorage e sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // 2. Remover canais realtime
  const channels = supabase.getChannels();
  channels.forEach(channel => {
    supabase.removeChannel(channel);
  });
  
  // 3. Fazer logout no Supabase
  await supabase.auth.signOut({ scope: 'local' });
  
  // 4. Recarregar página para resetar estado React
  window.location.href = '/';
};
