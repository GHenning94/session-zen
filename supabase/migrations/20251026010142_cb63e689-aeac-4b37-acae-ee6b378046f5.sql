-- ============================================
-- FASE 1: ESTRUTURA DE BANCO DE DADOS (ORDEM CORRIGIDA)
-- Sistema de Sessões, Pagamentos, Pacotes e Recorrência
-- ============================================

-- 1.1 CRIAR TABELA: packages (PRIMEIRO)
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  total_sessoes INTEGER NOT NULL,
  sessoes_consumidas INTEGER DEFAULT 0,
  valor_total NUMERIC NOT NULL,
  valor_por_sessao NUMERIC,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  data_inicio DATE,
  data_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 CRIAR TABELA: recurring_sessions (SEGUNDO)
CREATE TABLE IF NOT EXISTS public.recurring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  parent_session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('diaria', 'semanal', 'quinzenal', 'mensal')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date DATE,
  recurrence_count INTEGER,
  dia_da_semana INTEGER,
  horario TIME NOT NULL,
  valor NUMERIC,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'cancelada')),
  google_calendar_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 CRIAR TABELA: payments (TERCEIRO - agora pode referenciar packages)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado', 'reembolsado')),
  metodo_pagamento TEXT DEFAULT 'A definir',
  data_vencimento DATE,
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 ATUALIZAR TABELA: sessions (AGORA sim pode referenciar packages e recurring_sessions)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_session_id UUID REFERENCES public.recurring_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'individual' CHECK (session_type IN ('individual', 'pacote', 'recorrente')),
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_sync_type TEXT CHECK (google_sync_type IN ('importado', 'espelhado', 'enviado', 'local', 'ignorado')),
  ADD COLUMN IF NOT EXISTS is_modified BOOLEAN DEFAULT false;

-- 1.5 HABILITAR RLS nas novas tabelas
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_sessions ENABLE ROW LEVEL SECURITY;

-- 1.6 RLS POLICIES para payments
CREATE POLICY "Users can manage their own payments"
  ON public.payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 1.7 RLS POLICIES para packages
CREATE POLICY "Users can manage their own packages"
  ON public.packages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 1.8 RLS POLICIES para recurring_sessions
CREATE POLICY "Users can manage their own recurring sessions"
  ON public.recurring_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 1.9 FUNCTION: Atualizar contador de sessões do pacote
CREATE OR REPLACE FUNCTION public.update_package_consumption()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.package_id IS NOT NULL AND NEW.status = 'realizada' AND (OLD.status IS NULL OR OLD.status != 'realizada') THEN
    UPDATE public.packages
    SET sessoes_consumidas = sessoes_consumidas + 1,
        status = CASE 
          WHEN sessoes_consumidas + 1 >= total_sessoes THEN 'concluido'
          ELSE 'ativo'
        END,
        updated_at = NOW()
    WHERE id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.10 TRIGGER: Atualizar pacote ao realizar sessão
DROP TRIGGER IF EXISTS trigger_update_package_consumption ON public.sessions;
CREATE TRIGGER trigger_update_package_consumption
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_package_consumption();

-- 1.11 FUNCTION: Criar pagamento automaticamente ao criar sessão
CREATE OR REPLACE FUNCTION public.create_payment_for_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não é de pacote e tem valor, criar pagamento individual
  IF NEW.package_id IS NULL AND NEW.valor IS NOT NULL THEN
    INSERT INTO public.payments (
      user_id, session_id, client_id, valor, status, data_vencimento, metodo_pagamento
    ) VALUES (
      NEW.user_id, 
      NEW.id, 
      NEW.client_id, 
      NEW.valor, 
      'pendente',
      NEW.data,
      'A definir'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.12 TRIGGER: Criar pagamento ao criar sessão
DROP TRIGGER IF EXISTS trigger_create_payment_for_session ON public.sessions;
CREATE TRIGGER trigger_create_payment_for_session
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_for_session();

-- 1.13 FUNCTION: Atualizar updated_at em payments
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1.14 TRIGGER: updated_at para payments
DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payments_updated_at();

-- 1.15 FUNCTION: Atualizar updated_at em packages
CREATE OR REPLACE FUNCTION public.update_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1.16 TRIGGER: updated_at para packages
DROP TRIGGER IF EXISTS trigger_update_packages_updated_at ON public.packages;
CREATE TRIGGER trigger_update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_packages_updated_at();

-- 1.17 FUNCTION: Atualizar updated_at em recurring_sessions
CREATE OR REPLACE FUNCTION public.update_recurring_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1.18 TRIGGER: updated_at para recurring_sessions
DROP TRIGGER IF EXISTS trigger_update_recurring_sessions_updated_at ON public.recurring_sessions;
CREATE TRIGGER trigger_update_recurring_sessions_updated_at
  BEFORE UPDATE ON public.recurring_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recurring_sessions_updated_at();

-- 1.19 MIGRAÇÃO: Converter sessões existentes para o novo formato
UPDATE public.sessions
SET session_type = 'individual'
WHERE session_type IS NULL;

-- 1.20 MIGRAÇÃO: Criar pagamentos retroativos para sessões existentes sem pagamento
INSERT INTO public.payments (user_id, session_id, client_id, valor, status, data_vencimento, metodo_pagamento)
SELECT 
  s.user_id, 
  s.id, 
  s.client_id, 
  s.valor, 
  CASE 
    WHEN s.status = 'realizada' THEN 'pago'
    WHEN s.status = 'cancelada' THEN 'cancelado'
    ELSE 'pendente'
  END,
  s.data,
  COALESCE(s.metodo_pagamento, 'A definir')
FROM public.sessions s
WHERE s.valor IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p 
    WHERE p.session_id = s.id
  );

-- 1.21 INDEXES para performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON public.payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_package_id ON public.payments(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON public.packages(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_client_id ON public.packages(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_user_id ON public.recurring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_package_id ON public.sessions(package_id);
CREATE INDEX IF NOT EXISTS idx_sessions_recurring_session_id ON public.sessions(recurring_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_type ON public.sessions(session_type);