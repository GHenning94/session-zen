-- Create referral audit log table for tracking all referral-related actions
CREATE TABLE IF NOT EXISTS public.referral_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Action tracking
  action TEXT NOT NULL, -- 'signup', 'payment', 'upgrade', 'downgrade', 'cancel', 'commission_created', 'commission_approved', 'commission_cancelled', 'commission_paid', 'gateway_routed'
  
  -- User information
  referrer_user_id UUID REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id),
  referral_id UUID REFERENCES public.referrals(id),
  payout_id UUID REFERENCES public.referral_payouts(id),
  
  -- Gateway information  
  gateway TEXT, -- 'stripe', 'asaas'
  gateway_customer_id TEXT,
  gateway_subscription_id TEXT,
  gateway_payment_id TEXT,
  
  -- Financial information
  gross_amount INTEGER, -- in cents
  gateway_fee INTEGER, -- in cents (taxes + fees)
  net_amount INTEGER, -- in cents (gross - fees)
  commission_amount INTEGER, -- in cents
  commission_rate NUMERIC(5, 2), -- percentage
  discount_applied BOOLEAN DEFAULT false,
  discount_amount INTEGER, -- in cents
  
  -- Plan information
  previous_plan TEXT,
  new_plan TEXT,
  billing_interval TEXT, -- 'monthly', 'yearly'
  
  -- Proration information (for upgrades)
  proration_credit INTEGER, -- in cents
  proration_charge INTEGER, -- in cents
  days_remaining INTEGER,
  
  -- Status and reasons
  status TEXT, -- 'success', 'pending', 'failed', 'cancelled'
  failure_reason TEXT,
  ineligibility_reason TEXT, -- Why commission was not applicable
  
  -- Metadata
  metadata JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.referral_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access (via service role key in edge functions)
-- No public policies needed since only admin functions will access this

-- Create index for faster queries
CREATE INDEX idx_referral_audit_log_referrer ON public.referral_audit_log(referrer_user_id);
CREATE INDEX idx_referral_audit_log_referred ON public.referral_audit_log(referred_user_id);
CREATE INDEX idx_referral_audit_log_action ON public.referral_audit_log(action);
CREATE INDEX idx_referral_audit_log_created ON public.referral_audit_log(created_at DESC);
CREATE INDEX idx_referral_audit_log_gateway ON public.referral_audit_log(gateway);

-- Add comment
COMMENT ON TABLE public.referral_audit_log IS 'Complete audit trail for all referral program actions including payments, commissions, and upgrades';