-- ========================================
-- REFERRAL PROGRAM DATABASE UPDATES
-- ========================================

-- 1. Add referral_code column to profiles for unique, resettable referral links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Add detailed banking fields for Asaas payments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT CHECK (tipo_pessoa IN ('PF', 'PJ'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_titular TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chave_pix TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details_updated_at TIMESTAMPTZ;

-- 3. Add new columns to referral_payouts for Asaas integration
ALTER TABLE public.referral_payouts ADD COLUMN IF NOT EXISTS asaas_transfer_id TEXT;
ALTER TABLE public.referral_payouts ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'ted'));

-- 4. Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'REF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Drop the old function to change return type
DROP FUNCTION IF EXISTS public.get_referrer_public_info(TEXT);

-- 6. Update the get_referrer_public_info function to use referral_code from profiles
CREATE OR REPLACE FUNCTION public.get_referrer_public_info(referral_code TEXT)
RETURNS TABLE(nome TEXT, profissao TEXT, avatar_url TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.nome::TEXT,
    p.profissao::TEXT,
    p.avatar_url::TEXT,
    p.user_id
  FROM profiles p
  WHERE p.referral_code = get_referrer_public_info.referral_code
    AND p.is_referral_partner = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_unique_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referrer_public_info(TEXT) TO anon, authenticated;