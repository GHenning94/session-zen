-- Allow anyone to view basic info of referral partners (for public invite page)
CREATE POLICY "Anyone can view referral partner basic info" 
ON profiles FOR SELECT 
USING (is_referral_partner = true);

-- Allow referred users to view their own referral record (for coupon display)
CREATE POLICY "Referred users can view their referral" 
ON referrals FOR SELECT 
USING (auth.uid() = referred_user_id);