-- Adicionar coluna para rastrear confirmação de e-mail estrita
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_confirmed_strict boolean NOT NULL DEFAULT false;

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed_strict 
ON public.profiles(email_confirmed_strict);

COMMENT ON COLUMN public.profiles.email_confirmed_strict IS 'Flag que indica se o usuário confirmou explicitamente o e-mail via link de signup. Não é alterado por password recovery.';