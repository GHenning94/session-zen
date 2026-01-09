-- Fix the overly permissive policy for asaas_subaccounts
-- Drop the permissive policy
DROP POLICY IF EXISTS "Service role can manage Asaas accounts" ON public.asaas_subaccounts;

-- The service role key bypasses RLS, so we don't need a permissive policy
-- Only users can view their own accounts
-- Edge functions using service role key will handle insert/update/delete