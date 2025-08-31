-- Add show_photo column to configuracoes table
ALTER TABLE public.configuracoes 
ADD COLUMN show_photo boolean DEFAULT true;