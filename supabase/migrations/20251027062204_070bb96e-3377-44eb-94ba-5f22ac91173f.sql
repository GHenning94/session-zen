-- Remove o trigger que envia email de confirmação automaticamente
-- pois agora usamos o edge function request-email-confirmation
DROP TRIGGER IF EXISTS on_auth_user_created_send_confirmation ON auth.users;
DROP FUNCTION IF EXISTS public.trigger_send_confirmation_email() CASCADE;
