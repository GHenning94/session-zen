-- Create registration tokens table for secure client registration links
CREATE TABLE public.registration_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own registration tokens" 
ON public.registration_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own registration tokens" 
ON public.registration_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registration tokens" 
ON public.registration_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_registration_tokens_token ON public.registration_tokens(token);
CREATE INDEX idx_registration_tokens_expires_at ON public.registration_tokens(expires_at);

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_registration_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM public.registration_tokens 
    WHERE expires_at < now();
END;
$$;