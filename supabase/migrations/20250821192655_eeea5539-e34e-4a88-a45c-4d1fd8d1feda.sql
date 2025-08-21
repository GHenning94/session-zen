-- First, remove all public access policies from profiles table
DROP POLICY IF EXISTS "Allow reading safe profile data for booking" ON public.profiles;
DROP POLICY IF EXISTS "Public booking access to safe fields only" ON public.profiles;

-- Remove public access policy from configuracoes table  
DROP POLICY IF EXISTS "Permitir leitura de agendamentos ativos" ON public.configuracoes;

-- Create a single secure function that returns only safe booking data
CREATE OR REPLACE FUNCTION public.get_safe_booking_data(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
        'custom_footer', c.custom_footer
      ),
      'profile', json_build_object(
        'user_id', p.user_id,
        'nome', p.nome,
        'profissao', p.profissao,
        'especialidade', p.especialidade,
        'bio', p.bio
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

-- Update the existing function to use the new secure approach
DROP FUNCTION IF EXISTS public.get_public_profile_by_slug(text);

-- Create an alias for backward compatibility
CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN public.get_safe_booking_data(page_slug);
END;
$$;

-- Grant execute permissions only for the booking function
GRANT EXECUTE ON FUNCTION public.get_safe_booking_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_safe_booking_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_slug(text) TO authenticated;