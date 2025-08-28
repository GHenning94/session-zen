-- Adicionar campo para foto pública do link de compartilhamento
ALTER TABLE public.profiles 
ADD COLUMN public_avatar_url text;