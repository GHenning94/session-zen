-- =====================================================
-- MELHORIAS DE SEGURANÇA E ROBUSTEZ NO SISTEMA DE COMISSÕES
-- =====================================================

-- 1. SNAPSHOT DA COMISSÃO: Campos para congelar dados no momento do cálculo
ALTER TABLE public.referral_payouts
ADD COLUMN IF NOT EXISTS gateway_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS amount_paid INTEGER,
ADD COLUMN IF NOT EXISTS net_amount INTEGER,
ADD COLUMN IF NOT EXISTS gateway_fee INTEGER,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS referred_user_id UUID,
ADD COLUMN IF NOT EXISTS billing_interval TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_deadline DATE;

-- 2. IDEMPOTÊNCIA: Prevenir comissões duplicadas por retry de webhook
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_payouts_idempotency 
ON public.referral_payouts (gateway_invoice_id, payment_type) 
WHERE gateway_invoice_id IS NOT NULL AND status = 'pending';

-- Índice para buscar payouts por invoice_id
CREATE INDEX IF NOT EXISTS idx_referral_payouts_gateway_invoice 
ON public.referral_payouts (gateway_invoice_id) 
WHERE gateway_invoice_id IS NOT NULL;

-- 3. ANTIFRAUDE: Tabela para detecção de padrões suspeitos
CREATE TABLE IF NOT EXISTS public.referral_fraud_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL,
    referred_user_id UUID NOT NULL,
    signal_type TEXT NOT NULL, -- 'same_cpf', 'same_card', 'same_ip', 'same_device', 'same_email_domain'
    signal_value TEXT, -- valor mascarado para auditoria
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    action_taken TEXT, -- 'blocked', 'approved', 'pending'
    notes TEXT
);

-- Habilitar RLS na tabela de fraude
ALTER TABLE public.referral_fraud_signals ENABLE ROW LEVEL SECURITY;

-- Política: Apenas service_role pode acessar
CREATE POLICY "Service role only access fraud signals"
ON public.referral_fraud_signals
FOR ALL
USING (false)
WITH CHECK (false);

-- 4. DELAY TÉCNICO NO PAYOUT: Campo para data limite de processamento
-- Payouts só processados após approval_deadline
-- approval_deadline = created_at + 15 dias (janela para chargebacks)

-- Função para definir deadline automaticamente
CREATE OR REPLACE FUNCTION public.set_payout_approval_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- Deadline de aprovação: 15 dias após criação para janela de chargeback
    NEW.approval_deadline := (NEW.created_at::DATE + INTERVAL '15 days')::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para definir deadline automaticamente
DROP TRIGGER IF EXISTS set_payout_approval_deadline_trigger ON public.referral_payouts;
CREATE TRIGGER set_payout_approval_deadline_trigger
    BEFORE INSERT ON public.referral_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payout_approval_deadline();

-- 5. FUNÇÃO PARA VERIFICAR SE AFILIADO SAIU DO PROGRAMA
-- Cancela comissões pendentes quando sair
CREATE OR REPLACE FUNCTION public.handle_referral_partner_exit()
RETURNS TRIGGER AS $$
BEGIN
    -- Se mudou is_referral_partner de TRUE para FALSE
    IF OLD.is_referral_partner = TRUE AND NEW.is_referral_partner = FALSE THEN
        -- Registrar data de saída
        NEW.left_referral_program_at := NOW();
        
        -- Cancelar todas as comissões pendentes
        UPDATE public.referral_payouts
        SET status = 'cancelled',
            failure_reason = 'Afiliado saiu do programa de indicação',
            updated_at = NOW()
        WHERE referrer_user_id = OLD.user_id
          AND status = 'pending';
        
        -- Log na auditoria
        INSERT INTO public.referral_audit_log (
            action,
            referrer_user_id,
            status,
            ineligibility_reason,
            metadata
        ) VALUES (
            'partner_exit',
            OLD.user_id,
            'cancelled',
            'Partner voluntarily left program',
            jsonb_build_object(
                'cancelled_at', NOW(),
                'pending_payouts_cancelled', (
                    SELECT COUNT(*) FROM public.referral_payouts 
                    WHERE referrer_user_id = OLD.user_id AND status = 'cancelled'
                    AND failure_reason = 'Afiliado saiu do programa de indicação'
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para saída do programa
DROP TRIGGER IF EXISTS handle_referral_partner_exit_trigger ON public.profiles;
CREATE TRIGGER handle_referral_partner_exit_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.is_referral_partner IS DISTINCT FROM NEW.is_referral_partner)
    EXECUTE FUNCTION public.handle_referral_partner_exit();

-- 6. FUNÇÃO PARA APROVAR PAYOUTS AUTOMATICAMENTE APÓS DEADLINE
CREATE OR REPLACE FUNCTION public.approve_eligible_payouts()
RETURNS INTEGER AS $$
DECLARE
    approved_count INTEGER;
BEGIN
    -- Aprovar payouts que passaram do deadline e ainda estão pendentes
    UPDATE public.referral_payouts
    SET status = 'approved',
        approved_at = NOW(),
        updated_at = NOW()
    WHERE status = 'pending'
      AND approval_deadline <= CURRENT_DATE
      -- Verificar se referral ainda está ativa
      AND referral_id IN (
          SELECT r.id FROM public.referrals r
          JOIN public.profiles p ON r.referred_user_id = p.user_id
          WHERE p.subscription_plan IN ('pro', 'premium')
      )
      -- Verificar se afiliado ainda está no programa
      AND referrer_user_id IN (
          SELECT user_id FROM public.profiles WHERE is_referral_partner = TRUE
      );
    
    GET DIAGNOSTICS approved_count = ROW_COUNT;
    RETURN approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comentários para documentação
COMMENT ON COLUMN public.referral_payouts.gateway_invoice_id IS 'ID do invoice no gateway - usado para idempotência';
COMMENT ON COLUMN public.referral_payouts.amount_paid IS 'Valor bruto pago (snapshot no momento do cálculo)';
COMMENT ON COLUMN public.referral_payouts.net_amount IS 'Valor líquido após taxas (snapshot)';
COMMENT ON COLUMN public.referral_payouts.gateway_fee IS 'Taxa do gateway (snapshot)';
COMMENT ON COLUMN public.referral_payouts.commission_rate IS 'Taxa de comissão aplicada (snapshot)';
COMMENT ON COLUMN public.referral_payouts.approval_deadline IS 'Data limite para aprovação (15 dias após criação)';
COMMENT ON COLUMN public.referral_payouts.approved_at IS 'Data de aprovação da comissão';
COMMENT ON COLUMN public.referral_payouts.payment_type IS 'Tipo: first_payment, recurring, annual_installment, proration';
COMMENT ON TABLE public.referral_fraud_signals IS 'Sinais de fraude detectados no programa de indicação';