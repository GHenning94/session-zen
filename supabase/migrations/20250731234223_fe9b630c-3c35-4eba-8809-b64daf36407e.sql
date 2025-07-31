-- Limpar tabelas desnecessárias que estão causando conflitos
-- Remover tabelas duplicadas/desnecessárias
DROP TABLE IF EXISTS public.pacientes CASCADE;
DROP TABLE IF EXISTS public.sessoes CASCADE;
DROP TABLE IF EXISTS public.notificacoes CASCADE;

-- Limpar dados antigos e inválidos da tabela events
DELETE FROM public.events WHERE user_id IS NULL AND is_public = false;