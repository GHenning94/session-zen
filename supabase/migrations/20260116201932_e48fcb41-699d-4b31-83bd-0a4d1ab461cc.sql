-- =============================================
-- FASE 1: Tabela de Planos Mensais para Sessões Recorrentes
-- =============================================

-- Criar tabela de planos mensais
CREATE TABLE public.monthly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recurring_session_id UUID REFERENCES public.recurring_sessions(id) ON DELETE SET NULL,
  
  -- Configuração do plano
  nome TEXT NOT NULL DEFAULT 'Plano Mensal',
  valor_mensal NUMERIC NOT NULL,
  dia_cobranca INTEGER NOT NULL CHECK (dia_cobranca >= 1 AND dia_cobranca <= 28),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  
  -- Renovação
  renovacao_automatica BOOLEAN NOT NULL DEFAULT true,
  
  -- Status do plano
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'cancelado', 'encerrado')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna de tipo de cobrança na tabela recurring_sessions
ALTER TABLE public.recurring_sessions 
ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'per_session' 
CHECK (billing_type IN ('per_session', 'monthly_plan'));

-- Adicionar referência ao plano mensal na recurring_sessions
ALTER TABLE public.recurring_sessions 
ADD COLUMN IF NOT EXISTS monthly_plan_id UUID REFERENCES public.monthly_plans(id) ON DELETE SET NULL;

-- Adicionar coluna para indicar se sessão foi desvinculada da recorrência
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS unlinked_from_recurring BOOLEAN DEFAULT false;

-- Adicionar referência ao plano mensal nos pagamentos
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS monthly_plan_id UUID REFERENCES public.monthly_plans(id) ON DELETE SET NULL;

-- Adicionar coluna para tipo de pagamento (sessão individual, pacote, plano mensal)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'session' 
CHECK (payment_type IN ('session', 'package', 'monthly_plan'));

-- Enable RLS
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies para monthly_plans
CREATE POLICY "Users can view their own monthly plans" 
ON public.monthly_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly plans" 
ON public.monthly_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly plans" 
ON public.monthly_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly plans" 
ON public.monthly_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_monthly_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_monthly_plans_updated_at
BEFORE UPDATE ON public.monthly_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_monthly_plans_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_monthly_plans_user_id ON public.monthly_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_client_id ON public.monthly_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_status ON public.monthly_plans(status);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_recurring_session ON public.monthly_plans(recurring_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_unlinked ON public.sessions(unlinked_from_recurring) WHERE unlinked_from_recurring = true;
CREATE INDEX IF NOT EXISTS idx_payments_monthly_plan ON public.payments(monthly_plan_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_billing_type ON public.recurring_sessions(billing_type);