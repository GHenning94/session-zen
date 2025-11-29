-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('security', 'payment', 'usage', 'system')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view notifications
CREATE POLICY "Admins can view all notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (public.current_user_has_role('admin'));

-- Policy: Only admins can mark as read
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_notifications(severity);

-- Function to create admin notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.admin_notifications (title, message, type, severity, metadata)
  VALUES (p_title, p_message, p_type, p_severity, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to detect unauthorized access attempts
CREATE OR REPLACE FUNCTION public.check_unauthorized_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_attempts INTEGER;
BEGIN
  -- Check for unauthorized attempts in the last hour
  SELECT COUNT(*) INTO v_recent_attempts
  FROM public.medical_audit_log
  WHERE action LIKE '%UNAUTHORIZED%'
    AND access_timestamp > NOW() - INTERVAL '1 hour';
  
  -- If more than 5 attempts, create critical notification
  IF v_recent_attempts > 5 THEN
    PERFORM public.create_admin_notification(
      'Múltiplas Tentativas de Acesso Não Autorizado',
      format('Detectadas %s tentativas de acesso não autorizado na última hora.', v_recent_attempts),
      'security',
      'critical',
      jsonb_build_object('count', v_recent_attempts, 'timeframe', '1 hour')
    );
  END IF;
END;
$$;

-- Function to check overdue payments
CREATE OR REPLACE FUNCTION public.check_overdue_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      format('%s pagamento(s) atrasado(s) totalizando R$ %.2f', v_overdue_count, v_overdue_total),
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
$$;

-- Function to check usage spikes
CREATE OR REPLACE FUNCTION public.check_usage_spikes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_sessions INTEGER;
  v_recent_logins INTEGER;
BEGIN
  -- Check sessions created in last hour
  SELECT COUNT(*) INTO v_recent_sessions
  FROM public.sessions
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Check admin sessions created in last hour
  SELECT COUNT(*) INTO v_recent_logins
  FROM public.admin_sessions
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Alert on high session creation
  IF v_recent_sessions > 50 THEN
    PERFORM public.create_admin_notification(
      'Pico de Uso Detectado',
      format('%s sessões criadas na última hora', v_recent_sessions),
      'usage',
      'warning',
      jsonb_build_object('sessions_count', v_recent_sessions, 'timeframe', '1 hour')
    );
  END IF;
  
  -- Alert on multiple admin logins
  IF v_recent_logins > 5 THEN
    PERFORM public.create_admin_notification(
      'Múltiplos Logins Administrativos',
      format('%s logins administrativos na última hora', v_recent_logins),
      'security',
      'warning',
      jsonb_build_object('logins_count', v_recent_logins, 'timeframe', '1 hour')
    );
  END IF;
END;
$$;

-- Trigger to check unauthorized access on medical log insert
CREATE OR REPLACE FUNCTION public.trigger_check_unauthorized_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if it's an unauthorized attempt
  IF NEW.action LIKE '%UNAUTHORIZED%' THEN
    PERFORM public.check_unauthorized_attempts();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_medical_audit_log_insert
AFTER INSERT ON public.medical_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_unauthorized_access();

-- Trigger to check overdue payments daily
CREATE OR REPLACE FUNCTION public.trigger_daily_payment_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if payment became overdue
  IF NEW.status = 'pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
    -- Check all overdue payments
    PERFORM public.check_overdue_payments();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_check_overdue
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_daily_payment_check();

-- Function to auto-expire old notifications (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
    OR (expires_at IS NOT NULL AND expires_at < NOW());
END;
$$;