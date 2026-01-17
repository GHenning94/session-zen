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
  billing_type: 'per_session' | 'monthly_plan';
  monthly_plan_id?: string | null;
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
  billing_type?: 'per_session' | 'monthly_plan';
  monthly_plan_data?: {
    valor_mensal: number;
    dia_cobranca: number;
    data_inicio: string;
    renovacao_automatica: boolean;
  };
}

export const useRecurringSessions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createRecurring = async (data: RecurringData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let monthlyPlanId: string | null = null;

      // Se for plano mensal, criar o plano primeiro
      if (data.billing_type === 'monthly_plan' && data.monthly_plan_data) {
        const { data: monthlyPlan, error: planError } = await supabase
          .from('monthly_plans')
          .insert({
            user_id: user.id,
            client_id: data.client_id,
            nome: 'Plano Mensal',
            valor_mensal: data.monthly_plan_data.valor_mensal,
            dia_cobranca: data.monthly_plan_data.dia_cobranca,
            data_inicio: data.monthly_plan_data.data_inicio,
            renovacao_automatica: data.monthly_plan_data.renovacao_automatica,
            status: 'ativo'
          })
          .select()
          .single();

        if (planError) throw planError;
        monthlyPlanId = monthlyPlan.id;

        // Criar a primeira cobrança mensal
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            client_id: data.client_id,
            monthly_plan_id: monthlyPlan.id,
            payment_type: 'monthly_plan',
            valor: data.monthly_plan_data.valor_mensal,
            status: 'pendente',
            data_vencimento: data.monthly_plan_data.data_inicio,
            metodo_pagamento: 'A definir'
          });

        if (paymentError) console.error('Erro ao criar cobrança:', paymentError);
      }

      // Criar a recorrência
      const { data: recurringSession, error } = await supabase
        .from('recurring_sessions')
        .insert({
          user_id: user.id,
          client_id: data.client_id,
          recurrence_type: data.recurrence_type,
          recurrence_interval: data.recurrence_interval || 1,
          recurrence_end_date: data.recurrence_end_date,
          recurrence_count: data.recurrence_count,
          dia_da_semana: data.dia_da_semana,
          horario: formatTimeForDatabase(data.horario),
          valor: data.billing_type === 'monthly_plan' ? null : data.valor,
          metodo_pagamento: data.metodo_pagamento,
          status: 'ativa',
          google_calendar_sync: data.google_calendar_sync || false,
          billing_type: data.billing_type || 'per_session',
          monthly_plan_id: monthlyPlanId
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar o plano mensal com o ID da recorrência
      if (monthlyPlanId) {
        await supabase
          .from('monthly_plans')
          .update({ recurring_session_id: recurringSession.id })
          .eq('id', monthlyPlanId);
      }

      // Gerar instâncias iniciais (próximos 90 dias ou até limite)
      await generateInstances(recurringSession.id, 90);

      toast({
        title: 'Recorrência criada',
        description: data.billing_type === 'monthly_plan' 
          ? 'Plano mensal e sessões recorrentes configurados com sucesso.'
          : 'Sessões recorrentes configuradas com sucesso.',
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

  const generateInstances = async (recurringId: string, daysAhead: number = 90) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar configuração da recorrência
      const { data: recurring, error: fetchError } = await supabase
        .from('recurring_sessions')
        .select('id, client_id, horario, recurrence_type, recurrence_interval, recurrence_end_date, recurrence_count, dia_da_semana, status, valor, metodo_pagamento, google_calendar_sync, billing_type')
        .eq('id', recurringId)
        .single();

      if (fetchError) throw fetchError;

      // Verificar se já existem sessões para evitar duplicatas
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('data')
        .eq('recurring_session_id', recurringId)
        .gte('data', today.toISOString().split('T')[0]);

      const existingDates = new Set(existingSessions?.map(s => s.data) || []);

      // Calcular próximas datas
      const instances = [];
      let currentDate = new Date(today);
      
      // Para recorrência semanal, ajustar para o próximo dia da semana correto
      if (recurring.recurrence_type === 'semanal' && recurring.dia_da_semana !== null) {
        const targetDay = recurring.dia_da_semana;
        const currentDay = currentDate.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget < 0) {
          daysUntilTarget += 7;
        } else if (daysUntilTarget === 0) {
          // Se é hoje, começar hoje mesmo
        }
        
        currentDate.setDate(currentDate.getDate() + daysUntilTarget);
      }

      const endDate = recurring.recurrence_end_date 
        ? new Date(recurring.recurrence_end_date) 
        : new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

      let count = 0;
      const maxCount = recurring.recurrence_count || 100;

      while (currentDate <= endDate && count < maxCount) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Só criar se não existir
        if (!existingDates.has(dateStr)) {
          const sessionData: any = {
            user_id: user.id,
            client_id: recurring.client_id,
            recurring_session_id: recurringId,
            session_type: 'recorrente',
            data: dateStr,
            horario: formatTimeForDatabase(recurring.horario),
            status: 'agendada',
            is_modified: false,
            unlinked_from_recurring: false
          };

          // Se for cobrança por sessão, incluir valor e método de pagamento
          if (recurring.billing_type === 'per_session') {
            sessionData.valor = recurring.valor;
            sessionData.metodo_pagamento = recurring.metodo_pagamento || 'A definir';
          }
          // Se for plano mensal, não incluir valor (já que está coberto pelo plano)

          instances.push(sessionData);
        }

        count++;

        // Avançar para a próxima data
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
    } catch (error: any) {
      console.error('Erro ao gerar instâncias:', error);
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
        .select('dia_da_semana, horario, recurrence_type, recurrence_interval, valor, metodo_pagamento, billing_type, monthly_plan_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Formatar horário se presente nos dados
      const formattedData: any = {
        ...data,
        ...(data.horario && { horario: formatTimeForDatabase(data.horario) })
      };
      
      // Remover campos que não pertencem à tabela recurring_sessions
      delete formattedData.monthly_plan_data;
      
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
        await supabase
          .from('sessions')
          .delete()
          .eq('recurring_session_id', id)
          .eq('is_modified', false)
          .gte('data', today);

        // Regenerar instâncias com a nova configuração
        await generateInstances(id, 90);
      } else {
        // Mesmo sem regeneração, atualizar valor e método de pagamento nas sessões futuras não modificadas
        const hasValueOrPaymentChange = 
          (data.valor !== undefined && data.valor !== currentRecurring.valor) ||
          (data.metodo_pagamento !== undefined && data.metodo_pagamento !== currentRecurring.metodo_pagamento);

        if (hasValueOrPaymentChange && currentRecurring.billing_type === 'per_session') {
          const today = new Date().toISOString().split('T')[0];
          const updateFields: any = {};
          
          if (data.valor !== undefined) {
            updateFields.valor = data.valor;
          }
          if (data.metodo_pagamento !== undefined) {
            updateFields.metodo_pagamento = data.metodo_pagamento;
          }

          // Atualizar sessões futuras não modificadas
          await supabase
            .from('sessions')
            .update(updateFields)
            .eq('recurring_session_id', id)
            .eq('is_modified', false)
            .gte('data', today);

          // Também atualizar os pagamentos associados
          const { data: updatedSessions } = await supabase
            .from('sessions')
            .select('id')
            .eq('recurring_session_id', id)
            .eq('is_modified', false)
            .gte('data', today);

          if (updatedSessions && updatedSessions.length > 0) {
            const sessionIds = updatedSessions.map(s => s.id);
            const paymentUpdateFields: any = {};
            
            if (data.valor !== undefined) {
              paymentUpdateFields.valor = data.valor;
            }
            if (data.metodo_pagamento !== undefined) {
              paymentUpdateFields.metodo_pagamento = data.metodo_pagamento;
            }

            await supabase
              .from('payments')
              .update(paymentUpdateFields)
              .in('session_id', sessionIds)
              .eq('status', 'pendente');
          }
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

  const deleteRecurring = async (id: string, deleteInstances: boolean = false) => {
    setLoading(true);
    try {
      // Buscar informações da recorrência
      const { data: recurring } = await supabase
        .from('recurring_sessions')
        .select('monthly_plan_id, billing_type')
        .eq('id', id)
        .single();

      if (deleteInstances) {
        // Deletar todas as instâncias futuras
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('sessions')
          .delete()
          .eq('recurring_session_id', id)
          .gte('data', today);
      }

      // Se tem plano mensal, encerrar o plano e cancelar cobranças futuras
      if (recurring?.monthly_plan_id) {
        await supabase
          .from('monthly_plans')
          .update({ status: 'encerrado' })
          .eq('id', recurring.monthly_plan_id);

        // Cancelar cobranças pendentes
        await supabase
          .from('payments')
          .update({ status: 'cancelado' })
          .eq('monthly_plan_id', recurring.monthly_plan_id)
          .eq('status', 'pendente');
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

  const unlinkSessionFromRecurring = async (sessionId: string) => {
    setLoading(true);
    try {
      // Desvincular a sessão da recorrência
      const { data: session, error } = await supabase
        .from('sessions')
        .update({
          recurring_session_id: null,
          session_type: 'individual',
          unlinked_from_recurring: true
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sessão desvinculada',
        description: 'Esta sessão agora é individual e não será afetada por alterações na recorrência.',
      });

      return session;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao desvincular sessão',
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
        is_modified: true
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

  const updateAllFutureInstances = async (recurringId: string, data: any) => {
    setLoading(true);
    try {
      // Formatar horário se presente nos dados
      const formattedData = {
        ...data,
        ...(data.horario && { horario: formatTimeForDatabase(data.horario) })
      };
      
      // Atualizar todas as sessões futuras não modificadas
      const today = new Date().toISOString().split('T')[0];
      const { error: updateError, count } = await supabase
        .from('sessions')
        .update(formattedData)
        .eq('recurring_session_id', recurringId)
        .eq('is_modified', false)
        .gte('data', today);

      if (updateError) {
        console.error('Erro ao atualizar sessões:', updateError);
        throw updateError;
      }

      console.log(`Sessões atualizadas: ${count}`);

      // Atualizar a regra de recorrência também
      const { error: recurringError } = await supabase
        .from('recurring_sessions')
        .update(formattedData)
        .eq('id', recurringId);

      if (recurringError) {
        console.error('Erro ao atualizar recorrência:', recurringError);
        // Não throw aqui para não afetar o fluxo principal
      }

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
    unlinkSessionFromRecurring,
    updateSingleInstance,
    updateAllFutureInstances,
  };
};