-- Convert existing hex colors to HSL format in configuracoes table
UPDATE public.configuracoes 
SET brand_color = CASE 
  WHEN brand_color LIKE '#%' THEN 
    CASE brand_color
      WHEN '#3b82f6' THEN '217 91% 60%'
      WHEN '#1e40af' THEN '217 91% 45%' 
      WHEN '#2563eb' THEN '217 91% 50%'
      WHEN '#dc2626' THEN '0 84% 60%'
      WHEN '#16a34a' THEN '142 76% 36%'
      WHEN '#ca8a04' THEN '45 93% 47%'
      WHEN '#9333ea' THEN '271 91% 65%'
      WHEN '#0891b2' THEN '188 94% 42%'
      WHEN '#e11d48' THEN '348 83% 47%'
      WHEN '#059669' THEN '160 84% 39%'
      ELSE '217 91% 45%' -- Default blue as fallback
    END
  ELSE COALESCE(brand_color, '217 91% 45%') -- Keep existing HSL or set default
END
WHERE brand_color IS NULL OR brand_color LIKE '#%' OR brand_color = '';

-- Ensure all users have a brand_color set
UPDATE public.configuracoes 
SET brand_color = '217 91% 45%'
WHERE brand_color IS NULL OR brand_color = '';