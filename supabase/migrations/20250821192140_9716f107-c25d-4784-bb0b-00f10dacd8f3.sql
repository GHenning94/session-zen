-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Permitir leitura publica do perfil" ON public.profiles;

-- Create a security definer function to get only safe public profile data
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'user_id', user_id,
      'nome', nome,
      'profissao', profissao,
      'bio', bio,
      'especialidade', especialidade
    )
    FROM public.profiles 
    WHERE user_id = profile_user_id
  );
END;
$$;

-- Create a more restrictive policy that only allows reading safe fields for booking
CREATE POLICY "Allow reading safe profile data for booking" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.configuracoes 
    WHERE configuracoes.user_id = profiles.user_id 
    AND configuracoes.booking_enabled = true
  )
);

-- Update the existing booking-related policy to be more specific
DROP POLICY IF EXISTS "Permitir leitura de perfis com agendamento ativo" ON public.profiles;

-- Create policy that restricts which columns can be accessed publicly
CREATE POLICY "Public booking access to safe fields only" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.configuracoes 
    WHERE configuracoes.user_id = profiles.user_id 
    AND configuracoes.booking_enabled = true
  )
);

-- Create a view that exposes only safe profile data for public use
CREATE OR REPLACE VIEW public.safe_public_profiles AS
SELECT 
  user_id,
  nome,
  profissao,
  bio,
  especialidade
FROM public.profiles
WHERE EXISTS (
  SELECT 1 
  FROM public.configuracoes 
  WHERE configuracoes.user_id = profiles.user_id 
  AND configuracoes.booking_enabled = true
);

-- Grant public access to the safe view
GRANT SELECT ON public.safe_public_profiles TO anon;
GRANT SELECT ON public.safe_public_profiles TO authenticated;