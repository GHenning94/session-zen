-- Corrigir search_path nas funções de 2FA

-- Recriar função de atualização com search_path seguro
CREATE OR REPLACE FUNCTION public.update_2fa_settings_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar função de limpeza com search_path seguro
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_codes()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_2fa_email_codes
  WHERE expires_at < now();
  
  DELETE FROM public.user_2fa_reset_requests
  WHERE expires_at < now() AND completed = false;
END;
$$;