-- Código do país do telefone (WhatsApp) do profissional, ex: +55, +351
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telefone_codigo_pais text;
