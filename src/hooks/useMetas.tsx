import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export type MetaTipo = 'sessoes' | 'clientes' | 'receita' | 'pacotes' | 'ticket_medio';

export interface Meta {
  id: string;
  user_id: string;
  tipo: MetaTipo;
  valor_meta: number;
  versao: number;
  data_inicio: string;
  data_conclusao: string | null;
  concluida: boolean;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export const useMetas = () => {
  const { user } = useAuth();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetas = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMetas((data || []) as Meta[]);
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

  useEffect(() => {
    loadMetas();
  }, [user]);

  const createMeta = async (tipo: MetaTipo, valor_meta: number) => {
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
        description: `Meta de ${getTipoLabel(tipo)} criada com sucesso.`
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
      const { error } = await supabase
        .from('metas')
        .update({
          concluida: true,
          data_conclusao: new Date().toISOString()
        })
        .eq('id', metaId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Criar notificação
      const meta = metas.find(m => m.id === metaId);
      if (meta) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          titulo: 'Meta Concluída! 🎉',
          conteudo: `Parabéns! Você concluiu sua meta de ${getTipoLabel(meta.tipo)}!`
        });
      }

      await loadMetas();
      toast({
        title: "Meta concluída! 🎉",
        description: "Parabéns pela conquista!"
      });
    } catch (error) {
      console.error('Erro ao marcar meta como concluída:', error);
    }
  };

  const verificarEMarcarMetasConcluidas = async (
    sessionsToday: number,
    activeClients: number,
    monthlyRevenue: number,
    activePackages: number,
    completionRate: number
  ) => {
    if (!user || metas.length === 0) return;

    const valores: Record<MetaTipo, number> = {
      sessoes: sessionsToday,
      clientes: activeClients,
      receita: monthlyRevenue,
      pacotes: activePackages,
      ticket_medio: completionRate
    };

    for (const meta of metas) {
      if (!meta.concluida && valores[meta.tipo] >= meta.valor_meta) {
        await marcarMetaConcluida(meta.id);
      }
    }
  };

  const getMetaAtivaPorTipo = (tipo: MetaTipo): Meta | undefined => {
    return metas.find(m => m.tipo === tipo && m.ativa && !m.concluida);
  };

  const getTipoLabel = (tipo: MetaTipo): string => {
    const labels: Record<MetaTipo, string> = {
      sessoes: 'Sessões',
      clientes: 'Clientes',
      receita: 'Receita Mensal',
      pacotes: 'Pacotes',
      ticket_medio: 'Performance'
    };
    return labels[tipo];
  };

  return {
    metas,
    isLoading,
    createMeta,
    updateMeta,
    deleteMeta,
    loadMetas,
    marcarMetaConcluida,
    verificarEMarcarMetasConcluidas,
    getMetaAtivaPorTipo,
    getTipoLabel
  };
};
