-- Adiciona coluna para armazenar código do país do telefone do cliente
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS telefone_codigo_pais text;

