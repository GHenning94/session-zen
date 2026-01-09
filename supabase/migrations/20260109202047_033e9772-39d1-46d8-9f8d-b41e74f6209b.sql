-- =====================================================
-- MELHORIAS ADICIONAIS: IDEMPOTÊNCIA + ANTIFRAUDE
-- =====================================================

-- 1. Campo para event_id do gateway (idempotência extra)
ALTER TABLE public.referral_payouts
ADD COLUMN IF NOT EXISTS gateway_event_id TEXT;

-- Índice único incluindo event_id para idempotência extrema
DROP INDEX IF EXISTS idx_referral_payouts_idempotency;
CREATE UNIQUE INDEX idx_referral_payouts_idempotency_v2 
ON public.referral_payouts (gateway_invoice_id, gateway_event_id, payment_type) 
WHERE gateway_invoice_id IS NOT NULL AND status IN ('pending', 'approved');

-- 2. Campos adicionais na tabela de sinais de fraude para identificadores técnicos
-- (IP, device fingerprint, stripe customer_id compartilhado)
-- Já existe a tabela, apenas documentar os signal_types adicionais suportados:
-- 'same_cpf', 'same_phone', 'same_card', 'same_ip', 'same_device', 'shared_customer_id'

COMMENT ON TABLE public.referral_fraud_signals IS 'Sinais de fraude detectados. signal_type pode ser: same_cpf, same_phone, same_card, same_ip, same_device, shared_customer_id';

-- 3. Tabela para rastrear IPs/devices por usuário (para detecção de padrões)
CREATE TABLE IF NOT EXISTS public.user_login_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ip_address INET,
    device_fingerprint TEXT,
    user_agent TEXT,
    stripe_customer_id TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    login_count INTEGER DEFAULT 1,
    UNIQUE(user_id, ip_address, device_fingerprint)
);

-- Habilitar RLS
ALTER TABLE public.user_login_fingerprints ENABLE ROW LEVEL SECURITY;

-- Política restritiva (apenas service_role)
CREATE POLICY "Service role only for fingerprints"
ON public.user_login_fingerprints
FOR ALL
USING (false)
WITH CHECK (false);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_fingerprints_ip ON public.user_login_fingerprints (ip_address);
CREATE INDEX IF NOT EXISTS idx_user_fingerprints_device ON public.user_login_fingerprints (device_fingerprint) WHERE device_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_fingerprints_stripe ON public.user_login_fingerprints (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON TABLE public.user_login_fingerprints IS 'Rastreia IPs e devices por usuário para detecção de fraude em comissões';