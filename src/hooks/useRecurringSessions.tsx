import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatTimeForDatabase } from '@/lib/utils';

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
  metodo_pagamento?: string;
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
  metodo_pagamento?: string;
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
          horario: formatTimeForDatabase(data.horario),
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
      const maxCount = 100; // Default maximum count

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
          horario: formatTimeForDatabase(recurring.horario),
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

  const updateRecurring = async (id: string, data: Partial<RecurringSession>, regenerateFutureSessions: boolean = true) => {
    setLoading(true);
    try {
      // Buscar configuração atual para comparação
      const { data: currentRecurring, error: fetchError } = await supabase
        .from('recurring_sessions')
        .select('dia_da_semana, horario, recurrence_type, recurrence_interval, valor, metodo_pagamento')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Formatar horário se presente nos dados
      const formattedData = {
        ...data,
        ...(data.horario && { horario: formatTimeForDatabase(data.horario) })
      };
      
      const { data: recurringSession, error } = await supabase
        .from('recurring_sessions')
        .update(formattedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Verificar se houve alteração no dia da semana, horário ou tipo de recorrência
      const needsRegeneration = regenerateFutureSessions && (
        (data.dia_da_semana !== undefined && data.dia_da_semana !== currentRecurring.dia_da_semana) ||
        (data.horario !== undefined && formatTimeForDatabase(data.horario) !== currentRecurring.horario) ||
        (data.recurrence_type !== undefined && data.recurrence_type !== currentRecurring.recurrence_type) ||
        (data.recurrence_interval !== undefined && data.recurrence_interval !== currentRecurring.recurrence_interval)
      );

      if (needsRegeneration) {
        // Deletar sessões futuras não modificadas
        const today = new Date().toISOString().split('T')[0];
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('recurring_session_id', id)
          .eq('is_modified', false)
          .gte('data', today);

        if (deleteError) throw deleteError;

        // Regenerar instâncias com a nova configuração
        await regenerateInstancesInternal(recurringSession);
      } else {
        // Mesmo sem regeneração, atualizar valor e método de pagamento nas sessões futuras não modificadas
        const hasValueOrPaymentChange = 
          (data.valor !== undefined && data.valor !== currentRecurring.valor) ||
          (data.metodo_pagamento !== undefined && data.metodo_pagamento !== currentRecurring.metodo_pagamento);

        if (hasValueOrPaymentChange) {
          const today = new Date().toISOString().split('T')[0];
          const updateFields: any = {};
          
          if (data.valor !== undefined) {
            updateFields.valor = data.valor;
          }
          if (data.metodo_pagamento !== undefined) {
            updateFields.metodo_pagamento = data.metodo_pagamento;
          }

          const { error: updateSessionsError } = await supabase
            .from('sessions')
            .update(updateFields)
            .eq('recurring_session_id', id)
            .eq('is_modified', false)
            .gte('data', today);

          if (updateSessionsError) throw updateSessionsError;
        }
      }

      toast({
        title: 'Recorrência atualizada',
        description: needsRegeneration 
          ? 'Configuração e sessões futuras atualizadas com sucesso.' 
          : 'Configuração atualizada com sucesso.',
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

  // Função interna para regenerar instâncias baseada na configuração atualizada
  const regenerateInstancesInternal = async (recurring: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const instances = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = recurring.recurrence_end_date 
      ? new Date(recurring.recurrence_end_date) 
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 dias à frente

    let currentDate = new Date(today);
    
    // Para recorrência semanal, ajustar para o próximo dia da semana correto
    if (recurring.recurrence_type === 'semanal' && recurring.dia_da_semana !== null) {
      const targetDay = recurring.dia_da_semana;
      const currentDay = currentDate.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
      }
      
      currentDate.setDate(currentDate.getDate() + daysUntilTarget);
    }

    let count = 0;
    const maxCount = recurring.recurrence_count || 100;

    while (currentDate <= endDate && count < maxCount) {
      instances.push({
        user_id: user.id,
        client_id: recurring.client_id,
        recurring_session_id: recurring.id,
        session_type: 'recorrente',
        data: currentDate.toISOString().split('T')[0],
        horario: formatTimeForDatabase(recurring.horario),
        valor: recurring.valor,
        metodo_pagamento: recurring.metodo_pagamento || 'A definir',
        status: 'agendada',
        is_modified: false
      });

      count++;

      // Avançar para a próxima data baseado no tipo de recorrência
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
    }

    if (instances.length > 0) {
      const { error: insertError } = await supabase
        .from('sessions')
        .insert(instances);

      if (insertError) throw insertError;
    }

    return instances;
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
      // Formatar horário se presente nos dados
      const formattedData = {
        ...data,
        ...(data.horario && { horario: formatTimeForDatabase(data.horario) }),
        is_modified: true // Marca como modificada individualmente
      };
      
      const { data: session, error } = await supabase
        .from('sessions')
        .update(formattedData)
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
      // Formatar horário se presente nos dados
      const formattedData = {
        ...data,
        ...(data.horario && { horario: formatTimeForDatabase(data.horario) })
      };
      
      // Atualizar todas as sessões futuras não modificadas
      const { error } = await supabase
        .from('sessions')
        .update(formattedData)
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
