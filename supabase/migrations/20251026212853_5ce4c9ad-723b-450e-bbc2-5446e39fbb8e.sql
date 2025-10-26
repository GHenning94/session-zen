-- Function to sync payment status when session status changes
CREATE OR REPLACE FUNCTION public.sync_payment_status_from_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update payments if session status changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Update payment status based on session status
    UPDATE public.payments
    SET 
      status = CASE
        WHEN NEW.status = 'realizada' THEN 'pago'
        WHEN NEW.status = 'cancelada' THEN 'cancelado'
        WHEN NEW.status = 'falta' THEN 'pendente'
        ELSE status
      END,
      data_pagamento = CASE
        WHEN NEW.status = 'realizada' THEN COALESCE(data_pagamento, NEW.data)
        ELSE data_pagamento
      END,
      updated_at = NOW()
    WHERE session_id = NEW.id
      AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on sessions table
DROP TRIGGER IF EXISTS sync_payment_on_session_update ON public.sessions;
CREATE TRIGGER sync_payment_on_session_update
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_status_from_session();

-- One-time correction: sync existing payments with their session status
UPDATE public.payments p
SET 
  status = CASE
    WHEN s.status = 'realizada' THEN 'pago'
    WHEN s.status = 'cancelada' THEN 'cancelado'
    WHEN s.status = 'falta' THEN 'pendente'
    ELSE p.status
  END,
  data_pagamento = CASE
    WHEN s.status = 'realizada' AND p.data_pagamento IS NULL THEN s.data
    ELSE p.data_pagamento
  END,
  updated_at = NOW()
FROM public.sessions s
WHERE p.session_id = s.id
  AND p.status = 'pendente'
  AND s.status IN ('realizada', 'cancelada', 'falta');