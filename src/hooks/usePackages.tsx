import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatTimeForDatabase } from '@/lib/utils';

export interface Package {
  id: string;
  user_id: string;
  client_id: string;
  nome: string;
  total_sessoes: number;
  sessoes_consumidas: number;
  valor_total: number;
  valor_por_sessao?: number;
  metodo_pagamento?: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PackageData {
  client_id: string;
  nome: string;
  total_sessoes: number;
  valor_total: number;
  valor_por_sessao?: number;
  metodo_pagamento?: string;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
}

export const usePackages = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPackage = async (data: PackageData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const valorPorSessao = data.valor_por_sessao || (data.valor_total / data.total_sessoes);

      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .insert({
          user_id: user.id,
          ...data,
          valor_por_sessao: valorPorSessao,
          sessoes_consumidas: 0,
          status: 'ativo'
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Criar pagamento único para o pacote
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          package_id: packageData.id,
          client_id: data.client_id,
          valor: data.valor_total,
          status: 'pendente',
          metodo_pagamento: data.metodo_pagamento || 'A definir',
          data_vencimento: data.data_inicio
        });

      if (paymentError) throw paymentError;

      toast({
        title: 'Pacote criado',
        description: `Pacote de ${data.total_sessoes} sessões criado com sucesso.`,
      });

      return packageData;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar pacote',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createSessionsForPackage = async (
    packageId: string,
    clientId: string,
    dates: { data: string; horario: string; valor: number }[]
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const sessions = dates.map(d => ({
        user_id: user.id,
        client_id: clientId,
        package_id: packageId,
        session_type: 'pacote',
        data: d.data,
        horario: formatTimeForDatabase(d.horario),
        valor: d.valor,
        status: 'agendada',
        metodo_pagamento: 'A definir'
      }));

      const { error } = await supabase
        .from('sessions')
        .insert(sessions);

      if (error) throw error;

      toast({
        title: 'Sessões criadas',
        description: `${dates.length} sessões do pacote foram agendadas.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar sessões',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePackage = async (id: string, data: Partial<Package>) => {
    setLoading(true);
    try {
      const { data: packageData, error } = await supabase
        .from('packages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Pacote atualizado',
        description: 'Pacote atualizado com sucesso.',
      });

      return packageData;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pacote',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelPackage = async (id: string) => {
    return updatePackage(id, { status: 'cancelado' });
  };

  const deletePackage = async (id: string) => {
    setLoading(true);
    try {
      // Deletar sessões associadas ao pacote
      const { error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('package_id', id);

      if (sessionsError) throw sessionsError;

      // Deletar pagamentos associados ao pacote
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('package_id', id);

      if (paymentsError) throw paymentsError;

      // Deletar o pacote
      const { error: packageError } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

      if (packageError) throw packageError;

      toast({
        title: 'Pacote excluído',
        description: 'Pacote e todos os dados associados foram excluídos.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir pacote',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPackageProgress = (pkg: Package) => {
    const percentage = (pkg.sessoes_consumidas / pkg.total_sessoes) * 100;
    const remaining = pkg.total_sessoes - pkg.sessoes_consumidas;
    
    return {
      percentage,
      remaining,
      consumed: pkg.sessoes_consumidas,
      total: pkg.total_sessoes,
      isComplete: pkg.sessoes_consumidas >= pkg.total_sessoes
    };
  };

  return {
    loading,
    createPackage,
    createSessionsForPackage,
    updatePackage,
    cancelPackage,
    deletePackage,
    getPackageProgress,
  };
};
