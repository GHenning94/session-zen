-- Tabela para contas Stripe Connect dos parceiros
CREATE TABLE public.stripe_connect_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, restricted, disabled
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  country TEXT DEFAULT 'BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para rastrear indicações
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL, -- Quem indicou
  referred_user_id UUID NOT NULL UNIQUE, -- Quem foi indicado
  referral_code TEXT NOT NULL, -- Código usado na indicação (user_id do referrer)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, converted, cancelled
  subscription_plan TEXT, -- Plano que o indicado assinou
  subscription_amount INTEGER, -- Valor da assinatura em centavos
  commission_rate DECIMAL(5,2) DEFAULT 30.00, -- Taxa de comissão (30%)
  commission_amount INTEGER, -- Valor da comissão em centavos
  first_payment_date TIMESTAMPTZ, -- Data do primeiro pagamento
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para histórico de pagamentos de comissões
CREATE TABLE public.referral_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referral_id UUID REFERENCES public.referrals(id),
  stripe_transfer_id TEXT, -- ID da transferência no Stripe
  amount INTEGER NOT NULL, -- Valor em centavos
  currency TEXT DEFAULT 'brl',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, paid, failed
  failure_reason TEXT,
  period_start DATE, -- Período de referência
  period_end DATE,
  referred_user_name TEXT, -- Nome do usuário indicado (para histórico)
  referred_plan TEXT, -- Plano do indicado
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referral_payouts_referrer ON public.referral_payouts(referrer_user_id);
CREATE INDEX idx_referral_payouts_status ON public.referral_payouts(status);
CREATE INDEX idx_stripe_connect_user ON public.stripe_connect_accounts(user_id);

-- Habilitar RLS
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para stripe_connect_accounts
CREATE POLICY "Users can view their own connect account"
  ON public.stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connect account"
  ON public.stripe_connect_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connect account"
  ON public.stripe_connect_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas RLS para referrals
CREATE POLICY "Referrers can view their referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Políticas RLS para referral_payouts
CREATE POLICY "Users can view their own payouts"
  ON public.referral_payouts FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Triggers para updated_at
CREATE TRIGGER update_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_payouts_updated_at
  BEFORE UPDATE ON public.referral_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();