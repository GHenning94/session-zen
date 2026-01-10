-- Add column to store payout preference (manual or automatic)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payout_mode TEXT DEFAULT 'manual' CHECK (payout_mode IN ('manual', 'automatic'));

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.payout_mode IS 'Payout preference: manual (user requests) or automatic (processed on 15th of each month)';