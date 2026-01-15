-- Update the trigger function to propagate the payment method from session to payment
CREATE OR REPLACE FUNCTION public.create_payment_for_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se não é de pacote e tem valor, criar pagamento individual
  IF NEW.package_id IS NULL AND NEW.valor IS NOT NULL THEN
    INSERT INTO public.payments (
      user_id, session_id, client_id, valor, status, data_vencimento, metodo_pagamento
    ) VALUES (
      NEW.user_id, 
      NEW.id, 
      NEW.client_id, 
      NEW.valor, 
      'pendente',
      NEW.data,
      COALESCE(NEW.metodo_pagamento, 'A definir')
    );
  END IF;
  RETURN NEW;
END;
$function$;