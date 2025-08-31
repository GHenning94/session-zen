-- Update get_safe_booking_data function to include show_photo field
CREATE OR REPLACE FUNCTION public.get_safe_booking_data(page_slug text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$