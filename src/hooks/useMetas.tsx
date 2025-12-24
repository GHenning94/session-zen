import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type MetaTipo = 'sessoes' | 'clientes' | 'receita' | 'pacotes' | 'ticket_medio';
export type MetaPeriodo = 'diario' | 'semanal' | 'mensal';

export interface Meta {
  id: string;
  user_id: string;
  tipo: MetaTipo;
  valor_meta: number;
  periodo: MetaPeriodo;
  versao: number;
  data_inicio: string;
  data_conclusao: string | null;
  concluida: boolean;
  ativa: boolean;
  notificado_50: boolean;
  created_at: string;
  updated_at: string;
}

export const useMetas = () => {
  const { user } = useAuth();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mutex para evitar chamadas paralelas a verificarEMarcarMetasConcluidas
  const isCheckingMetasRef = useRef(false);

  const loadMetas = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('metas')
        .select('id, tipo, valor_meta, periodo, ativa, concluida, data_inicio, data_conclusao, versao, notificado_50, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMetas((data || []).map(m => ({ ...m, periodo: m.periodo || 'mensal', notificado_50: m.notificado_50 ?? false })) as Meta[]);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast({
        title: "Erro ao carregar metas",
        description: "Não foi possível carregar suas metas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMeta = async (metaId: string, valor_meta: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('metas')
        .update({ valor_meta, updated_at: new Date().toISOString() })
        .eq('id', metaId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadMetas();
      toast({
        title: "Meta atualizada!",
        description: "Meta atualizada com sucesso."
      });
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      toast({
        title: "Erro ao atualizar meta",
        description: "Não foi possível atualizar a meta.",
        variant: "destructive"
      });
    }
  };

  const deleteMeta = async (metaId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', metaId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadMetas();
      toast({
        title: "Meta excluída!",
        description: "Meta excluída com sucesso."
      });
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast({
        title: "Erro ao excluir meta",
        description: "Não foi possível excluir a meta.",
        variant: "destructive"
      });
    }
  };

  // Realtime subscription para sincronização instantânea
  useEffect(() => {
    if (!user) return;
    
    loadMetas();
    
    let channel: RealtimeChannel;
    
    const setupRealtimeSubscription = async () => {
      channel = supabase
        .channel('metas-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'metas',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Meta change detected:', payload);
            // Recarregar metas instantaneamente
            loadMetas();
          }
        )
        .subscribe();
    };
    
    setupRealtimeSubscription();
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  // Refetch on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadMetas();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const createMeta = async (tipo: MetaTipo, valor_meta: number, periodo: MetaPeriodo = 'mensal') => {
    if (!user) return;

    try {
      // Obter a última versão da meta deste tipo
      const { data: metasExistentes } = await supabase
        .from('metas')
        .select('versao')
        .eq('user_id', user.id)
        .eq('tipo', tipo)
        .order('versao', { ascending: false })
        .limit(1);

      const novaVersao = metasExistentes && metasExistentes.length > 0 
        ? metasExistentes[0].versao + 1 
        : 1;

      const { data, error } = await supabase
        .from('metas')
        .insert({
          user_id: user.id,
          tipo,
          valor_meta,
          periodo,
          versao: novaVersao,
          ativa: true,
          concluida: false
        })
        .select()
        .single();

      if (error) throw error;

      await loadMetas();
      toast({
        title: "Meta criada!",
        description: `Meta de ${getTipoLabel(tipo)} (${getPeriodoLabel(periodo)}) criada com sucesso.`
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast({
        title: "Erro ao criar meta",
        description: "Não foi possível criar a meta.",
        variant: "destructive"
      });
    }
  };

  const marcarMetaConcluida = async (metaId: string) => {
    if (!user) return;

    try {
      // PASSO 1: Verificar estado atual da meta antes de tentar atualizar
      const { data: metaAtual, error: checkError } = await supabase
        .from('metas')
        .select('id, tipo, ativa, concluida')
        .eq('id', metaId)
        .eq('user_id', user.id)
        .single();
      
      // Se a meta não existe ou já foi processada, sair imediatamente
      if (checkError || !metaAtual || !metaAtual.ativa || metaAtual.concluida) {
        console.log('[useMetas] Meta não encontrada ou já processada, ignorando:', metaId);
        return;
      }

      // PASSO 2: Usar update condicional atômico: só atualiza se ativa = true e concluida = false
      const { data: updatedMeta, error: updateError } = await supabase
        .from('metas')
        .update({
          concluida: true,
          ativa: false,
          data_conclusao: new Date().toISOString()
        })
        .eq('id', metaId)
        .eq('user_id', user.id)
        .eq('ativa', true)
        .eq('concluida', false)
        .select('id, tipo')
        .maybeSingle();

      // Se não retornou dados, significa que já estava concluída (race condition evitada)
      if (!updatedMeta) {
        console.log('[useMetas] Meta já foi concluída por outra chamada, ignorando duplicata');
        return;
      }

      if (updateError) throw updateError;

      // PASSO 3: Criar notificação apenas se a atualização foi bem-sucedida
      console.log('[useMetas] Criando notificação para meta concluída:', updatedMeta.id);
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: user.id,
        titulo: 'Meta Concluída! 🎉',
        conteudo: `Parabéns! Você concluiu sua meta de ${getTipoLabel(updatedMeta.tipo as MetaTipo)}!`,
        lida: false,
        data: new Date().toISOString()
      });
      
      if (notifError) {
        console.error('Erro ao criar notificação:', notifError);
      }
    } catch (error) {
      console.error('Erro ao marcar meta como concluída:', error);
    }
  };

  const notificar50Porcento = async (metaId: string) => {
    if (!user) return;

    try {
      // Usar update condicional atômico: só atualiza se notificado_50 = false
      // Isso evita race conditions e duplicatas
      const { data: updatedMeta, error: updateError } = await supabase
        .from('metas')
        .update({ notificado_50: true, updated_at: new Date().toISOString() })
        .eq('id', metaId)
        .eq('user_id', user.id)
        .eq('notificado_50', false) // Condição atômica: só atualiza se ainda não foi notificado
        .select('id, tipo')
        .maybeSingle();

      // Se não retornou dados, significa que já estava notificado ou não existe
      if (!updatedMeta) {
        console.log('[useMetas] Meta já foi notificada 50% ou não encontrada, ignorando');
        return;
      }

      if (updateError) throw updateError;

      // Criar notificação apenas se a atualização foi bem-sucedida
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: user.id,
        titulo: 'Você está na metade do caminho! 🎯',
        conteudo: `Parabéns! Você já atingiu 50% da sua meta de ${getTipoLabel(updatedMeta.tipo as MetaTipo)}. Continue assim!`,
        lida: false,
        data: new Date().toISOString()
      });
      
      if (notifError) {
        console.error('Erro ao criar notificação 50%:', notifError);
      }
    } catch (error) {
      console.error('Erro ao notificar 50%:', error);
    }
  };

  const verificarEMarcarMetasConcluidas = async (
    valoresAtuais: Record<MetaTipo, number>
  ) => {
    // Mutex: evitar chamadas paralelas
    if (isCheckingMetasRef.current) {
      console.log('[useMetas] Já está verificando metas, ignorando chamada paralela');
      return;
    }
    
    if (!user || metas.length === 0) return;
    
    isCheckingMetasRef.current = true;
    console.log('[useMetas] Iniciando verificação de metas...');

    try {
      for (const meta of metas) {
        if (!meta.ativa || meta.concluida) continue;
        
        const valorAtual = valoresAtuais[meta.tipo];
        const progresso = (valorAtual / meta.valor_meta) * 100;
        
        // Verificar 50%
        if (progresso >= 50 && !meta.notificado_50) {
          await notificar50Porcento(meta.id);
        }
        
        // Verificar conclusão
        if (valorAtual >= meta.valor_meta) {
          await marcarMetaConcluida(meta.id);
        }
      }
    } finally {
      isCheckingMetasRef.current = false;
      console.log('[useMetas] Verificação de metas concluída');
    }
  };

  const getMetaAtivaPorTipo = (tipo: MetaTipo): Meta | undefined => {
    return metas.find(m => m.tipo === tipo && m.ativa && !m.concluida);
  };

  const getTipoLabel = (tipo: MetaTipo, clientTermPlural: string = 'Clientes'): string => {
    const labels: Record<MetaTipo, string> = {
      sessoes: 'Sessões',
      clientes: clientTermPlural,
      receita: 'Receita',
      pacotes: 'Pacotes',
      ticket_medio: 'Performance (Taxa de conclusão de sessões)'
    };
    return labels[tipo];
  };

  const getPeriodoLabel = (periodo: MetaPeriodo): string => {
    const labels: Record<MetaPeriodo, string> = {
      diario: 'Diário',
      semanal: 'Semanal',
      mensal: 'Mensal'
    };
    return labels[periodo];
  };

  const updateMetaPeriodo = async (metaId: string, periodo: MetaPeriodo) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('metas')
        .update({ periodo, updated_at: new Date().toISOString() })
        .eq('id', metaId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadMetas();
      toast({
        title: "Período atualizado!",
        description: `Período da meta alterado para ${getPeriodoLabel(periodo)}.`
      });
    } catch (error) {
      console.error('Erro ao atualizar período:', error);
      toast({
        title: "Erro ao atualizar período",
        description: "Não foi possível atualizar o período.",
        variant: "destructive"
      });
    }
  };

  return {
    metas,
    isLoading,
    createMeta,
    updateMeta,
    updateMetaPeriodo,
    deleteMeta,
    loadMetas,
    marcarMetaConcluida,
    verificarEMarcarMetasConcluidas,
    getMetaAtivaPorTipo,
    getTipoLabel,
    getPeriodoLabel
  };
};
