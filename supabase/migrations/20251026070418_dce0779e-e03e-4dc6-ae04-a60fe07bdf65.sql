-- Remove obsolete 'plano' column from profiles table
-- Keep only 'subscription_plan' as the source of truth
ALTER TABLE profiles DROP COLUMN IF EXISTS plano;