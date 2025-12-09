-- Fix invalid format() specifiers in check_overdue_payments function
-- PostgreSQL format() only supports %s, %I, %L - not %.2f (C-style specifiers)

CREATE OR REPLACE FUNCTION public.check_overdue_payments()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_overdue_count INTEGER;
  v_overdue_total NUMERIC;
BEGIN
  -- Check for overdue payments
  SELECT 
    COUNT(*),
    COALESCE(SUM(valor), 0)
  INTO v_overdue_count, v_overdue_total
  FROM public.payments
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE
    AND data_vencimento > CURRENT_DATE - INTERVAL '7 days';
  
  -- If there are overdue payments from last 7 days, create warning
  IF v_overdue_count > 0 THEN
    PERFORM public.create_admin_notification(
      'Pagamentos Atrasados',
      format('%s pagamento(s) atrasado(s) totalizando R$ %s', v_overdue_count, TO_CHAR(v_overdue_total, 'FM999999990.00')),
      'payment',
      CASE 
        WHEN v_overdue_count > 10 THEN 'critical'
        WHEN v_overdue_count > 5 THEN 'warning'
        ELSE 'info'
      END,
      jsonb_build_object('count', v_overdue_count, 'total', v_overdue_total)
    );
  END IF;
END;
$function$;