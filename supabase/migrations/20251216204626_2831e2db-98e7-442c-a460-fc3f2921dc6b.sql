-- Create trigger function to delete associated payments when session is deleted
CREATE OR REPLACE FUNCTION public.delete_session_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete any payment associated with this session
  DELETE FROM public.payments WHERE session_id = OLD.id;
  RETURN OLD;
END;
$function$;

-- Create trigger to run before session deletion
DROP TRIGGER IF EXISTS trigger_delete_session_payment ON public.sessions;
CREATE TRIGGER trigger_delete_session_payment
  BEFORE DELETE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_session_payment();

-- Also clean up any orphan payments (payments without session_id and without package_id)
DELETE FROM public.payments 
WHERE session_id IS NULL 
  AND package_id IS NULL;