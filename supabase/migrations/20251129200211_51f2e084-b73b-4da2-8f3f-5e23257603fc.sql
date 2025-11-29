-- Adicionar colunas para controle de mudança de email
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_new_email TEXT,
ADD COLUMN IF NOT EXISTS email_change_nonce TEXT,
ADD COLUMN IF NOT EXISTS email_change_nonce_expires_at TIMESTAMP WITH TIME ZONE;

-- Comentários para documentar
COMMENT ON COLUMN public.profiles.pending_new_email IS 'Email pendente aguardando confirmação de mudança';
COMMENT ON COLUMN public.profiles.email_change_nonce IS 'Token único para validar mudança de email';
COMMENT ON COLUMN public.profiles.email_change_nonce_expires_at IS 'Data de expiração do token de mudança de email (24h)';