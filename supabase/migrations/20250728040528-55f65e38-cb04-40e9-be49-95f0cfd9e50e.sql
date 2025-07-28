-- Run approved migration for sharing and Google API configuration
-- Add Google API key secret configuration
-- This will be used by the Google Calendar integration

-- Update subscription status check function to handle edge cases
CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(page_slug text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- Add columns for new sharing features to configuracoes table
ALTER TABLE public.configuracoes 
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#ffffff', 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS background_image TEXT,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS custom_footer TEXT;

-- Add avatar_url to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index on slug for better performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_slug ON public.configuracoes(slug);

-- Create a trigger to update updated_at on configuracoes
CREATE OR REPLACE FUNCTION update_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER trigger_update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracoes_updated_at();