-- Create function to send notifications for new bookings and session reminders
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notification for new booking
  INSERT INTO public.notifications (
    user_id,
    titulo,
    conteudo
  ) VALUES (
    NEW.user_id,
    'Nova Sessão Agendada',
    'Uma nova sessão foi agendada para ' || TO_CHAR(NEW.data, 'DD/MM/YYYY') || ' às ' || TO_CHAR(NEW.horario, 'HH24:MI')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new sessions
CREATE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();

-- Create function to send session reminders
CREATE OR REPLACE FUNCTION public.send_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert reminders for sessions happening tomorrow
  INSERT INTO public.notifications (
    user_id,
    titulo,
    conteudo
  )
  SELECT 
    s.user_id,
    'Lembrete de Sessão',
    'Você tem uma sessão agendada para amanhã (' || TO_CHAR(s.data, 'DD/MM/YYYY') || ') às ' || TO_CHAR(s.horario, 'HH24:MI')
  FROM public.sessions s
  WHERE s.data = CURRENT_DATE + INTERVAL '1 day'
    AND s.status = 'agendada'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.user_id = s.user_id 
        AND n.titulo = 'Lembrete de Sessão'
        AND n.conteudo LIKE '%' || TO_CHAR(s.data, 'DD/MM/YYYY') || '%'
        AND DATE(n.data) = CURRENT_DATE
    );
END;
$$;