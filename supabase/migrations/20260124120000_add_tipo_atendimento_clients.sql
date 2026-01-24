-- Adiciona coluna para armazenar tipo de atendimento (Individual, Casal, Família)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS tipo_atendimento text;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.clients.tipo_atendimento IS 'Tipo de atendimento: individual, casal ou familia';
