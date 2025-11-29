-- Remove foreign key constraint that links admin_sessions to auth.users
-- This allows the admin system to be completely independent from the public platform

ALTER TABLE public.admin_sessions 
DROP CONSTRAINT IF EXISTS admin_sessions_user_id_fkey;

-- Add comment to document this intentional design decision
COMMENT ON COLUMN public.admin_sessions.user_id IS 'Admin user identifier - intentionally NOT linked to auth.users for system independence';