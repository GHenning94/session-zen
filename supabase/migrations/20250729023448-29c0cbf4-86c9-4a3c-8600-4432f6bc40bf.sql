-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.send_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_data JSON;
BEGIN
  SELECT
    json_build_object(
      'config', row_to_json(c),
      'profile', row_to_json(p)
    )
  INTO profile_data
  FROM
    public.configuracoes AS c
  JOIN
    public.profiles AS p ON c.user_id = p.user_id
  WHERE
    c.slug = page_slug;

  RETURN profile_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_configuracoes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;