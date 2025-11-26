import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringSession {
  id: string;
  user_id: string;
  client_id: string;
  parent_session_id?: string | null;
  recurrence_type: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
  recurrence_interval: number;
  recurrence_end_date?: string | null;
  recurrence_count?: number | null;
  dia_da_semana?: number | null;
  horario: string;
  valor?: number;
  status: 'ativa' | 'pausada' | 'cancelada';
  google_calendar_sync: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringData {
  client_id: string;
  recurrence_type: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_count?: number;
  dia_da_semana?: number;
  horario: string;
  valor?: number;
  google_calendar_sync?: boolean;
}

export const useRecurringSessions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createRecurring = async (data: RecurringData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: recurringSession, error } = await supabase
        .from('recurring_sessions')
        .insert({
          user_id: user.id,
          ...data,
          recurrence_interval: data.recurrence_interval || 1,
          status: 'ativa',
          google_calendar_sync: data.google_calendar_sync || false
        })
        .select()
        .single();

      if (error) throw error;

      // Gerar instâncias iniciais (próximos 30 dias ou até limite)
      await generateInstances(recurringSession.id, 30);

      toast({
        title: 'Recorrência criada',
        description: 'Sessões recorrentes configuradas com sucesso.',
      });

      return recurringSession;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar recorrência',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateInstances = async (recurringId: string, daysAhead: number = 30) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar configuração da recorrência
      const { data: recurring, error: fetchError } = await supabase
        .from('recurring_sessions')
        .select('id, client_id, horario, recurrence_type, recurrence_interval, recurrence_end_date, dia_da_semana, status, valor, google_calendar_sync')
        .eq('id', recurringId)
        .single();

      if (fetchError) throw fetchError;

      // Calcular próximas datas
      const instances = [];
      let currentDate = new Date();
      const endDate = recurring.recurrence_end_date 
        ? new Date(recurring.recurrence_end_date) 
        : new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

      let count = 0;
      const maxCount = recurring.recurrence_count || 100;

      while (currentDate <= endDate && count < maxCount) {
        // Ajustar data baseado no tipo de recorrência
        switch (recurring.recurrence_type) {
          case 'diaria':
            currentDate.setDate(currentDate.getDate() + recurring.recurrence_interval);
            break;
          case 'semanal':
            currentDate.setDate(currentDate.getDate() + (7 * recurring.recurrence_interval));
            break;
          case 'quinzenal':
            currentDate.setDate(currentDate.getDate() + (14 * recurring.recurrence_interval));
            break;
          case 'mensal':
            currentDate.setMonth(currentDate.getMonth() + recurring.recurrence_interval);
            break;
        }

        instances.push({
          user_id: user.id,
          client_id: recurring.client_id,
          recurring_session_id: recurringId,
          session_type: 'recorrente',
          data: currentDate.toISOString().split('T')[0],
          horario: recurring.horario,
          valor: recurring.valor,
          status: 'agendada'
        });

        count++;
      }

      if (instances.length > 0) {
        const { error: insertError } = await supabase
          .from('sessions')
          .insert(instances);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Instâncias geradas',
        description: `${instances.length} sessões futuras criadas.`,
      });

      return instances;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar instâncias',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRecurring = async (id: string, data: Partial<RecurringSession>) => {
    setLoading(true);
    try {
      const { data: recurringSession, error } = await supabase
        .from('recurring_sessions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Recorrência atualizada',
        description: 'Configuração atualizada com sucesso.',
      });

      return recurringSession;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar recorrência',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteRecurring = async (id: string, deleteInstances: boolean = false) => {
    setLoading(true);
    try {
      if (deleteInstances) {
        // Deletar todas as instâncias futuras
        const { error: sessionsError } = await supabase
          .from('sessions')
          .delete()
          .eq('recurring_session_id', id)
          .gte('data', new Date().toISOString().split('T')[0]);

        if (sessionsError) throw sessionsError;
      }

      const { error } = await supabase
        .from('recurring_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Recorrência excluída',
        description: deleteInstances 
          ? 'Recorrência e sessões futuras excluídas.' 
          : 'Recorrência excluída. Sessões existentes mantidas.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir recorrência',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateSingleInstance = async (sessionId: string, data: any) => {
    setLoading(true);
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .update({
          ...data,
          is_modified: true // Marca como modificada individualmente
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sessão atualizada',
        description: 'Esta instância foi modificada.',
      });

      return session;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar sessão',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAllInstances = async (recurringId: string, data: any) => {
    setLoading(true);
    try {
      // Atualizar todas as sessões futuras não modificadas
      const { error } = await supabase
        .from('sessions')
        .update(data)
        .eq('recurring_session_id', recurringId)
        .eq('is_modified', false)
        .gte('data', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      toast({
        title: 'Série atualizada',
        description: 'Todas as sessões futuras foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar série',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createRecurring,
    generateInstances,
    updateRecurring,
    deleteRecurring,
    updateSingleInstance,
    updateAllInstances,
  };
};
