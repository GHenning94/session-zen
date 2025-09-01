-- Security Fix: Set search_path for all functions to prevent search path attacks
-- This addresses the "function_search_path_mutable" security warning

-- Fix existing functions by setting search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, profissao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data ->> 'profissao', 'Psicólogo')
  );
  
  INSERT INTO public.configuracoes (user_id, link_agendamento)
  VALUES (
    NEW.id,
    'https://therapypro.app/agendar/' || NEW.id
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_configuracoes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_safe_booking_data(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_data JSON;
BEGIN
  -- Only return safe, non-sensitive data needed for booking
  SELECT
    json_build_object(
      'config', json_build_object(
        'user_id', c.user_id,
        'booking_enabled', c.booking_enabled,
        'show_price', c.show_price,
        'show_duration', c.show_duration,
        'show_photo', c.show_photo,
        'valor_padrao', c.valor_padrao,
        'valor_primeira_consulta', c.valor_primeira_consulta,
        'duracao_sessao', c.duracao_sessao,
        'intervalo_sessoes', c.intervalo_sessoes,
        'horario_inicio', c.horario_inicio,
        'horario_fim', c.horario_fim,
        'dias_atendimento_array', c.dias_atendimento_array,
        'horarios_por_dia', c.horarios_por_dia,
        'aceita_pix', c.aceita_pix,
        'aceita_cartao', c.aceita_cartao,
        'aceita_dinheiro', c.aceita_dinheiro,
        'aceita_transferencia', c.aceita_transferencia,
        'page_title', c.page_title,
        'page_description', c.page_description,
        'brand_color', c.brand_color,
        'background_color', c.background_color,
        'background_image', c.background_image,
        'logo_url', c.logo_url,
        'custom_css', c.custom_css,
        'custom_footer', c.custom_footer,
        'chave_pix', c.chave_pix,
        'dados_bancarios', c.dados_bancarios,
        'email_contato_pacientes', c.email_contato_pacientes,
        'whatsapp_contato_pacientes', c.whatsapp_contato_pacientes
      ),
      'profile', json_build_object(
        'user_id', p.user_id,
        'nome', p.nome,
        'profissao', p.profissao,
        'especialidade', p.especialidade,
        'bio', p.bio,
        'public_avatar_url', p.public_avatar_url
      )
    )
  INTO booking_data
  FROM
    public.configuracoes AS c
  JOIN
    public.profiles AS p ON c.user_id = p.user_id
  WHERE
    c.slug = page_slug
    AND c.booking_enabled = true;

  RETURN booking_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_safe_booking_data(page_slug);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log for authenticated users
    IF auth.uid() IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            INSERT INTO public.audit_log (
                user_id, action, table_name, record_id, old_values
            ) VALUES (
                auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id::text, row_to_json(OLD)
            );
            RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO public.audit_log (
                user_id, action, table_name, record_id, old_values, new_values
            ) VALUES (
                auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(OLD), row_to_json(NEW)
            );
            RETURN NEW;
        ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO public.audit_log (
                user_id, action, table_name, record_id, new_values
            ) VALUES (
                auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW)
            );
            RETURN NEW;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;