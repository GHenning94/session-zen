-- Create table for user coupons
CREATE TABLE public.user_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  discount TEXT NOT NULL,
  description TEXT NOT NULL,
  coupon_type TEXT NOT NULL DEFAULT 'generic', -- 'referral', 'promotional', 'loyalty', etc.
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_coupons_user_id_code_unique UNIQUE (user_id, code)
);

-- Enable Row Level Security
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own coupons" 
ON public.user_coupons 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_coupons_updated_at
BEFORE UPDATE ON public.user_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_user_coupons_user_id ON public.user_coupons(user_id);
CREATE INDEX idx_user_coupons_is_used ON public.user_coupons(is_used);

-- Insert referral coupon for users who were referred
INSERT INTO public.user_coupons (user_id, code, discount, description, coupon_type, is_used, used_at)
SELECT 
  r.referred_user_id as user_id,
  'INDICACAO20' as code,
  '20%' as discount,
  '20% de desconto no primeiro mês do plano Profissional' as description,
  'referral' as coupon_type,
  CASE WHEN r.first_payment_date IS NOT NULL THEN true ELSE false END as is_used,
  r.first_payment_date as used_at
FROM public.referrals r
ON CONFLICT (user_id, code) DO NOTHING;