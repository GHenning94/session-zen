-- Tabela para configurações de 2FA por usuário
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_2fa_enabled BOOLEAN DEFAULT false,
  authenticator_2fa_enabled BOOLEAN DEFAULT false,
  authenticator_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para códigos de backup do 2FA
CREATE TABLE IF NOT EXISTS public.user_2fa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para códigos OTP temporários por e-mail
CREATE TABLE IF NOT EXISTS public.user_2fa_email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para solicitações de redefinição de 2FA
CREATE TABLE IF NOT EXISTS public.user_2fa_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reset_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_email_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_reset_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_2fa_settings
CREATE POLICY "Users can view their own 2FA settings"
  ON public.user_2fa_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
  ON public.user_2fa_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
  ON public.user_2fa_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para user_2fa_backup_codes
CREATE POLICY "Users can view their own backup codes"
  ON public.user_2fa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes"
  ON public.user_2fa_backup_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup codes"
  ON public.user_2fa_backup_codes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para user_2fa_email_codes (somente via functions)
CREATE POLICY "Service role can manage email codes"
  ON public.user_2fa_email_codes FOR ALL
  USING ((auth.jwt()->>'role')::text = 'service_role');

-- Políticas RLS para user_2fa_reset_requests
CREATE POLICY "Users can view their own reset requests"
  ON public.user_2fa_reset_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reset requests"
  ON public.user_2fa_reset_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_2fa_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_2fa_settings_updated_at();

-- Função para limpar códigos expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_2fa_email_codes
  WHERE expires_at < now();
  
  DELETE FROM public.user_2fa_reset_requests
  WHERE expires_at < now() AND completed = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices para performance
CREATE INDEX idx_2fa_settings_user_id ON public.user_2fa_settings(user_id);
CREATE INDEX idx_2fa_backup_codes_user_id ON public.user_2fa_backup_codes(user_id);
CREATE INDEX idx_2fa_email_codes_user_id ON public.user_2fa_email_codes(user_id);
CREATE INDEX idx_2fa_email_codes_expires ON public.user_2fa_email_codes(expires_at);
CREATE INDEX idx_2fa_reset_requests_user_id ON public.user_2fa_reset_requests(user_id);
CREATE INDEX idx_2fa_reset_requests_token ON public.user_2fa_reset_requests(reset_token);