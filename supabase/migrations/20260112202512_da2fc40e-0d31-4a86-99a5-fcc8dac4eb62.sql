-- Fix get_safe_booking_data by splitting json_build_object to avoid 100-argument limit
CREATE OR REPLACE FUNCTION public.get_safe_booking_data(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  booking_data JSON;
  config_basic JSONB;
  config_premium JSONB;
  profile_data JSON;
BEGIN
  -- Construir config básico (primeira parte)
  SELECT jsonb_build_object(
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
  )
  INTO config_basic
  FROM public.configuracoes AS c
  WHERE c.slug = page_slug AND c.booking_enabled = true;

  -- Se não encontrou, retornar null
  IF config_basic IS NULL THEN
    RETURN NULL;
  END IF;

  -- Construir config premium (segunda parte)
  SELECT jsonb_build_object(
    'visual_theme', c.visual_theme,
    'block_order', c.block_order,
    'show_payment_methods', c.show_payment_methods,
    'highlight_first_consultation', c.highlight_first_consultation,
    'highlight_available_today', c.highlight_available_today,
    'highlight_promo_value', c.highlight_promo_value,
    'emphasize_first_consultation', c.emphasize_first_consultation,
    'welcome_message', c.welcome_message,
    'show_pre_booking_notes', c.show_pre_booking_notes,
    'pre_booking_notes', c.pre_booking_notes,
    'cta_button_text', c.cta_button_text,
    'trust_badges', c.trust_badges,
    'show_values_after_selection', c.show_values_after_selection,
    'show_starting_from_value', c.show_starting_from_value,
    'footer_text_color', c.footer_text_color,
    'footer_bg_color', c.footer_bg_color,
    'min_advance_hours', c.min_advance_hours,
    'max_future_days', c.max_future_days,
    'max_daily_appointments', c.max_daily_appointments,
    'cancellation_policy', c.cancellation_policy,
    'require_policy_confirmation', c.require_policy_confirmation,
    'hide_filled_slots', c.hide_filled_slots,
    'post_booking_message', c.post_booking_message,
    'post_booking_redirect', c.post_booking_redirect,
    'post_booking_url', c.post_booking_url
  )
  INTO config_premium
  FROM public.configuracoes AS c
  WHERE c.slug = page_slug AND c.booking_enabled = true;

  -- Construir profile
  SELECT json_build_object(
    'user_id', p.user_id,
    'nome', p.nome,
    'profissao', p.profissao,
    'especialidade', p.especialidade,
    'bio', p.bio,
    'public_avatar_url', p.public_avatar_url
  )
  INTO profile_data
  FROM public.configuracoes AS c
  JOIN public.profiles AS p ON c.user_id = p.user_id
  WHERE c.slug = page_slug AND c.booking_enabled = true;

  -- Combinar tudo em um único JSON usando merge de JSONB
  SELECT json_build_object(
    'config', (config_basic || config_premium)::json,
    'profile', profile_data
  )
  INTO booking_data;

  RETURN booking_data;
END;
$$;

-- Também atualizar get_public_profile_by_slug que usa get_safe_booking_data
CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.get_safe_booking_data(page_slug);
END;
$$;