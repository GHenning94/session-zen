-- Remove the potentially problematic view
DROP VIEW IF EXISTS public.safe_public_profiles;

-- Remove the security definer function as well since we don't need it
DROP FUNCTION IF EXISTS public.get_safe_public_profile(uuid);

-- The RLS policies we created are sufficient - they will prevent access to sensitive fields
-- Let's ensure the existing get_public_profile_by_slug function only returns safe data
CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(page_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  profile_data JSON;
BEGIN
  SELECT
    json_build_object(
      'config', row_to_json(c),
      'profile', json_build_object(
        'user_id', p.user_id,
        'nome', p.nome,
        'profissao', p.profissao,
        'bio', p.bio,
        'especialidade', p.especialidade
      )
    )
  INTO profile_data
  FROM
    public.configuracoes AS c
  JOIN
    public.profiles AS p ON c.user_id = p.user_id
  WHERE
    c.slug = page_slug
    AND c.booking_enabled = true;

  RETURN profile_data;
END;
$$;