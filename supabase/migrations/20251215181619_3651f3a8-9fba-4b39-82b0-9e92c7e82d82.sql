-- Add referral partner status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_referral_partner boolean DEFAULT false;