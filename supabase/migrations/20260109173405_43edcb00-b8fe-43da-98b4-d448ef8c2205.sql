-- Add RLS policy for admin-only access (prevents linter warning)
-- This table is accessed via service role key, but we add a deny-all policy for extra security
CREATE POLICY "No public access to referral audit log"
ON public.referral_audit_log
FOR ALL
USING (false);

-- Allow admin role if needed in future
CREATE POLICY "Admins can view referral audit logs"
ON public.referral_audit_log
FOR SELECT
USING (public.current_user_has_role('admin'));