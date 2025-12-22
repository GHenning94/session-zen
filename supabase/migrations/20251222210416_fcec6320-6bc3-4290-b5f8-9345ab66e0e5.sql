-- Add periodo column to metas table
ALTER TABLE public.metas 
ADD COLUMN periodo text NOT NULL DEFAULT 'mensal';

-- Add comment for documentation
COMMENT ON COLUMN public.metas.periodo IS 'Period for the goal: diario, semanal, mensal';