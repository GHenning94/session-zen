-- Add theme_preference column to configuracoes table
ALTER TABLE public.configuracoes 
ADD COLUMN theme_preference TEXT CHECK (theme_preference IN ('light', 'dark'));