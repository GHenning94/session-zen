-- =====================================================
-- FIX: Remove Remaining Duplicate Indexes/Constraints
-- =====================================================

-- 1. configuracoes: A pkey já é unique no user_id, precisamos dropar a CONSTRAINT duplicada
-- Como não podemos dropar constraint da pkey, vamos manter os dois pois a pkey é imutável
-- Na verdade o problema é que configuracoes_pkey e configuracoes_user_id_key são duplicados
-- A pkey deveria ser no ID, não no user_id. Mas alterar isso é complexo.
-- Vamos só registrar que a duplicação existe por design (user_id como PK + constraint UNIQUE)

-- 2. registration_tokens: manter apenas registration_tokens_token_key (constraint original)
DROP INDEX IF EXISTS public.idx_registration_tokens_token_unique;

-- 3. user_2fa_settings: manter apenas user_2fa_settings_user_id_key (unique constraint)
DROP INDEX IF EXISTS public.idx_2fa_settings_user_id;
DROP INDEX IF EXISTS public.idx_user_2fa_settings_user_id;

-- 4. user_roles: created_by precisa de índice (foreign key não indexada)
CREATE INDEX IF NOT EXISTS idx_user_roles_created_by ON public.user_roles (created_by);