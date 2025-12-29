-- Create trigger to automatically create payment when session is created
-- This trigger calls the existing create_payment_for_session function

DROP TRIGGER IF EXISTS trigger_create_payment_for_session ON public.sessions;

CREATE TRIGGER trigger_create_payment_for_session
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_for_session();