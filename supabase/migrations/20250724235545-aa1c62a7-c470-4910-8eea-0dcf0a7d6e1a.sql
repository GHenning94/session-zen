-- Add new columns to configuracoes table for sharing settings
ALTER TABLE public.configuracoes 
ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS page_title TEXT,
ADD COLUMN IF NOT EXISTS page_description TEXT,
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS background_image TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS show_price BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_duration BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_footer TEXT;