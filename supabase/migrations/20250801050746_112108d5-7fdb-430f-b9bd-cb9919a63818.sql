-- Adicionar campo para armazenar horários específicos por dia
ALTER TABLE public.configuracoes ADD COLUMN horarios_por_dia JSONB DEFAULT '{}'::jsonb;