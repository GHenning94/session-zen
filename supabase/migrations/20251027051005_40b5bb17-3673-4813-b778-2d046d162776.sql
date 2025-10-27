-- Disable duplicate password reset emails by removing the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_recovery_send_email ON auth.users;

-- Optionally remove the helper function (no longer referenced after trigger removal)
DROP FUNCTION IF EXISTS public.trigger_send_password_reset_email();