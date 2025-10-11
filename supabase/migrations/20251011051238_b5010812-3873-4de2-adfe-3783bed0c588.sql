-- Fix brand_color format for all existing records
-- Convert HEX colors to HSL triplet format

UPDATE public.configuracoes 
SET brand_color = '217 91% 45%' 
WHERE brand_color = '#3b82f6' 
   OR brand_color LIKE '#%'
   OR brand_color LIKE 'rgb%'
   OR brand_color NOT LIKE '% % %';

-- Update default value for new records
ALTER TABLE public.configuracoes 
ALTER COLUMN brand_color SET DEFAULT '217 91% 45%';

-- Add comment explaining the format
COMMENT ON COLUMN public.configuracoes.brand_color IS 'Brand color in HSL triplet format: H S% L% (e.g., 217 91% 45%)';