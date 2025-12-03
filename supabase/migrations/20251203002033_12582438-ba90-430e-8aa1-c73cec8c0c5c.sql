-- Remove the trigger that automatically syncs payment status from session status
DROP TRIGGER IF EXISTS sync_payment_on_session_update ON public.sessions;

-- Now drop the function
DROP FUNCTION IF EXISTS public.sync_payment_status_from_session();
