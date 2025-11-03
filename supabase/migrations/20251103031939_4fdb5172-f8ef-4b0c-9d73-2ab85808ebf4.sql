-- Add nonce columns to profiles table for email confirmation link invalidation
ALTER TABLE public.profiles 
ADD COLUMN email_confirmation_nonce text NULL,
ADD COLUMN email_confirmation_nonce_expires_at timestamptz NULL;

-- Add index for faster nonce lookups
CREATE INDEX idx_profiles_confirmation_nonce ON public.profiles(email_confirmation_nonce) 
WHERE email_confirmation_nonce IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.email_confirmation_nonce IS 'Unique nonce for email confirmation links. When a new link is generated, this invalidates all previous links.';
COMMENT ON COLUMN public.profiles.email_confirmation_nonce_expires_at IS 'Expiration timestamp for the confirmation nonce. Links expire after 24 hours.';