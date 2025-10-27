-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send confirmation email via SendPulse
CREATE OR REPLACE FUNCTION public.trigger_send_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  token_hash text;
  user_meta jsonb;
BEGIN
  -- Only send email for new users that need confirmation
  IF NEW.email_confirmed_at IS NULL AND NEW.confirmation_token IS NOT NULL THEN
    -- Get user metadata
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Get the confirmation token hash
    token_hash := NEW.confirmation_token;
    
    -- Call the edge function asynchronously via pg_net
    SELECT net.http_post(
      url := 'https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/send-confirmation-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4'
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'token_hash', token_hash,
        'user_metadata', user_meta
      )
    ) INTO request_id;
    
    -- Log the request (optional, for debugging)
    RAISE LOG 'Confirmation email triggered for user %, request_id: %', NEW.email, request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to send password reset email via SendPulse
CREATE OR REPLACE FUNCTION public.trigger_send_password_reset_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  token_hash text;
  user_meta jsonb;
BEGIN
  -- Only send email when recovery token is updated
  IF NEW.recovery_token IS NOT NULL AND (OLD.recovery_token IS NULL OR OLD.recovery_token != NEW.recovery_token) THEN
    -- Get user metadata
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Get the recovery token hash
    token_hash := NEW.recovery_token;
    
    -- Call the edge function asynchronously via pg_net
    SELECT net.http_post(
      url := 'https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/send-password-reset-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4'
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'token_hash', token_hash,
        'user_metadata', user_meta
      )
    ) INTO request_id;
    
    -- Log the request (optional, for debugging)
    RAISE LOG 'Password reset email triggered for user %, request_id: %', NEW.email, request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for confirmation emails
DROP TRIGGER IF EXISTS on_auth_user_created_send_confirmation ON auth.users;
CREATE TRIGGER on_auth_user_created_send_confirmation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_confirmation_email();

-- Create trigger for password reset emails
DROP TRIGGER IF EXISTS on_auth_user_recovery_send_email ON auth.users;
CREATE TRIGGER on_auth_user_recovery_send_email
  AFTER UPDATE OF recovery_token ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_password_reset_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;