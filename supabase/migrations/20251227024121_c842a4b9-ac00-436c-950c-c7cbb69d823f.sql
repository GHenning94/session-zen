-- =====================================================
-- FIX: Remove Duplicate Indexes and Consolidate Policies
-- =====================================================

-- ==============================================
-- 1. REMOVE DUPLICATE INDEXES
-- ==============================================

-- admin_sessions: Keep one session_token index (the unique one is enough)
DROP INDEX IF EXISTS public.idx_admin_sessions_session_token;
DROP INDEX IF EXISTS public.idx_admin_sessions_token;

-- configuracoes: Keep unique constraint, remove duplicate user_id index
DROP INDEX IF EXISTS public.idx_configuracoes_user_id;

-- registration_tokens: Keep unique constraint on token, remove duplicate
DROP INDEX IF EXISTS public.idx_registration_tokens_token;

-- user_2fa_backup_codes: Remove duplicate user_id index
DROP INDEX IF EXISTS public.idx_user_2fa_backup_codes_user_id;

-- user_2fa_email_codes: Remove duplicate indexes
DROP INDEX IF EXISTS public.idx_user_2fa_email_codes_user_id;
DROP INDEX IF EXISTS public.idx_user_2fa_email_codes_expires_at;

-- user_2fa_reset_requests: Remove duplicate user_id index
DROP INDEX IF EXISTS public.idx_user_2fa_reset_requests_user_id;

-- ==============================================
-- 2. FIX MULTIPLE PERMISSIVE POLICIES ON user_roles
-- The issue is that "Service role can manage roles" (ALL) 
-- overlaps with "Users can view their own roles" (SELECT)
-- Solution: Make service role policy RESTRICTIVE or combine them
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create single unified SELECT policy
-- Users can see their own roles OR service_role can see all
CREATE POLICY "View roles policy" ON public.user_roles
FOR SELECT USING (
  (select auth.uid()) = user_id 
  OR ((select auth.jwt()) ->> 'role'::text) = 'service_role'::text
);

-- Service role can INSERT
CREATE POLICY "Service role insert roles" ON public.user_roles
FOR INSERT WITH CHECK (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- Service role can UPDATE
CREATE POLICY "Service role update roles" ON public.user_roles
FOR UPDATE USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- Service role can DELETE
CREATE POLICY "Service role delete roles" ON public.user_roles
FOR DELETE USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- ==============================================
-- 3. ADD INDEX FOR user_roles FOREIGN KEY (user_id)
-- Since unique constraint exists, we don't need another index
-- The unique constraint on (user_id, role) already covers user_id
-- ==============================================

-- No action needed - user_roles_user_id_role_key already covers this