import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  user_id: string;
  session_id?: string | null;
  package_id?: string | null;
  client_id: string;
  valor: number;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'reembolsado';
  metodo_pagamento?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentData {
  session_id?: string;
  package_id?: string;
  client_id: string;
  valor: number;
  status?: string;
  metodo_pagamento?: string;
  data_vencimento?: string;
  observacoes?: string;
}

export const usePayments = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPayment = async (data: PaymentData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          ...data,
          status: data.status || 'pendente',
          metodo_pagamento: data.metodo_pagamento || 'A definir'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Pagamento criado',
        description: 'Pagamento registrado com sucesso.',
      });

      return payment;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar pagamento',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePayment = async (id: string, data: Partial<Payment>) => {
    setLoading(true);
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Pagamento atualizado',
        description: 'Pagamento atualizado com sucesso.',
      });

      return payment;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pagamento',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Pagamento excluído',
        description: 'Pagamento excluído com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir pagamento',
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string, method: string) => {
    return updatePayment(id, {
      status: 'pago',
      metodo_pagamento: method,
      data_pagamento: new Date().toISOString().split('T')[0]
    });
  };

  const calculatePaymentStatus = (payment: Payment): 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'reembolsado' => {
    if (payment.status === 'pago' || payment.status === 'cancelado' || payment.status === 'reembolsado') {
      return payment.status;
    }

    if (payment.data_vencimento) {
      const today = new Date();
      const dueDate = new Date(payment.data_vencimento);
      if (dueDate < today) {
        return 'atrasado';
      }
    }

    return 'pendente';
  };

  return {
    loading,
    createPayment,
    updatePayment,
    deletePayment,
    markAsPaid,
    calculatePaymentStatus,
  };
};
