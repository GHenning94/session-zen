-- Create table for tracking admin login attempts (for lockout functionality)
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address inet NOT NULL,
    email_hash text NOT NULL,
    attempted_at timestamp with time zone NOT NULL DEFAULT now(),
    success boolean NOT NULL DEFAULT false
);

-- Create index for efficient lookups
CREATE INDEX idx_admin_login_attempts_ip_time ON public.admin_login_attempts (ip_address, attempted_at);
CREATE INDEX idx_admin_login_attempts_email_time ON public.admin_login_attempts (email_hash, attempted_at);

-- Enable RLS
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage login attempts (used by edge functions)
CREATE POLICY "Service role only access" 
ON public.admin_login_attempts 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Create function to check if admin login is locked out
CREATE OR REPLACE FUNCTION public.check_admin_lockout(
    p_ip inet,
    p_email_hash text,
    p_max_attempts integer DEFAULT 5,
    p_lockout_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_failed_count integer;
BEGIN
    -- Count failed attempts in the lockout window
    SELECT COUNT(*) INTO v_failed_count
    FROM public.admin_login_attempts
    WHERE (ip_address = p_ip OR email_hash = p_email_hash)
      AND attempted_at > now() - (p_lockout_minutes || ' minutes')::interval
      AND success = false;

    -- Return true if locked out
    RETURN v_failed_count >= p_max_attempts;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_admin_login_attempt(
    p_ip inet,
    p_email_hash text,
    p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Record the attempt
    INSERT INTO public.admin_login_attempts (ip_address, email_hash, success)
    VALUES (p_ip, p_email_hash, p_success);
    
    -- Clean up old entries (older than 24 hours)
    DELETE FROM public.admin_login_attempts
    WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- Create function to clear lockout on successful login
CREATE OR REPLACE FUNCTION public.clear_admin_lockout(
    p_ip inet,
    p_email_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Clear failed attempts for this IP/email on successful login
    DELETE FROM public.admin_login_attempts
    WHERE (ip_address = p_ip OR email_hash = p_email_hash)
      AND success = false;
END;
$$;