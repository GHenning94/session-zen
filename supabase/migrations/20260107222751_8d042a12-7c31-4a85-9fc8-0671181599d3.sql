-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view referral partner basic info" ON profiles;

-- Create a more restrictive policy that only exposes specific fields needed for public invite page
-- This uses a security definer function approach for better control
CREATE OR REPLACE FUNCTION public.get_referrer_public_info(referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_info JSON;
BEGIN
  SELECT json_build_object(
    'nome', p.nome,
    'profissao', p.profissao,
    'avatar_url', p.avatar_url
  )
  INTO referrer_info
  FROM profiles p
  INNER JOIN referrals r ON r.referrer_user_id = p.user_id
  WHERE r.referral_code = get_referrer_public_info.referral_code
    AND p.is_referral_partner = true
  LIMIT 1;
  
  RETURN referrer_info;
END;
$$;