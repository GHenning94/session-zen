-- Add new premium design and advanced settings columns to configuracoes table

-- Visual Theme Settings
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS visual_theme TEXT DEFAULT 'minimal_clean';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS block_order TEXT[] DEFAULT ARRAY['photo', 'title', 'bio', 'specialty', 'welcome_message', 'values', 'schedule', 'payment_info', 'observations'];

-- Visual Highlights
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS highlight_first_consultation BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS highlight_available_today BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS highlight_promo_value BOOLEAN DEFAULT false;

-- Strategic Content
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS pre_booking_notes TEXT;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS show_pre_booking_notes BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cta_button_text TEXT DEFAULT 'Agendar Consulta';

-- Trust Badges
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS trust_badges TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Value Display Options
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS show_values_after_selection BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS show_starting_from_value BOOLEAN DEFAULT false;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS emphasize_first_consultation BOOLEAN DEFAULT false;

-- Payment Methods Toggle
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS show_payment_methods BOOLEAN DEFAULT true;

-- Custom Footer Colors
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS footer_text_color TEXT;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS footer_bg_color TEXT;

-- Scheduling Rules
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 1;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS max_future_days INTEGER DEFAULT 30;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS max_daily_appointments INTEGER;

-- Cancellation Policy
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS require_policy_confirmation BOOLEAN DEFAULT false;

-- Agenda Behavior
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS hide_filled_slots BOOLEAN DEFAULT false;

-- Patient Experience
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS post_booking_message TEXT;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS post_booking_redirect TEXT DEFAULT 'default';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS post_booking_url TEXT;