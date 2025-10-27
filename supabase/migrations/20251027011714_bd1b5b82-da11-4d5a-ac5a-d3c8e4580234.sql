-- Add first_login_completed flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT false;

-- Add billing_interval column to store monthly/annual info
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.first_login_completed IS 'Flag to track if user has completed onboarding and plan selection';
COMMENT ON COLUMN public.profiles.billing_interval IS 'Billing cycle from Stripe: month or year';