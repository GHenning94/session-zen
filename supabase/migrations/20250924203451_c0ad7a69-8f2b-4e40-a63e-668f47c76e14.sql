-- Fix invalid email data first, then add security constraints
-- Update invalid email to a proper format or set to NULL
UPDATE public.clients 
SET email = NULL 
WHERE email IS NOT NULL AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Now add the security constraints for data integrity
ALTER TABLE public.clients 
ADD CONSTRAINT clients_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add length constraints to prevent oversized data storage and potential attacks
ALTER TABLE public.clients 
ADD CONSTRAINT clients_nome_length CHECK (length(nome) <= 255),
ADD CONSTRAINT clients_email_length CHECK (email IS NULL OR length(email) <= 255),
ADD CONSTRAINT clients_telefone_length CHECK (telefone IS NULL OR length(telefone) <= 20),
ADD CONSTRAINT clients_historico_length CHECK (historico IS NULL OR length(historico) <= 10000),
ADD CONSTRAINT clients_dados_clinicos_length CHECK (dados_clinicos IS NULL OR length(dados_clinicos) <= 10000);

-- Add constraints to sessions table for security
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_anotacoes_length CHECK (anotacoes IS NULL OR length(anotacoes) <= 5000);

-- Add constraints to profiles table
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_nome_length CHECK (length(nome) <= 255);

-- Create a function to validate and sanitize input data
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove potential script tags and normalize whitespace
    RETURN TRIM(REGEXP_REPLACE(input_text, '<[^>]*>', '', 'gi'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;