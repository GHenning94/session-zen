-- Add payment method column to recurring_sessions table
ALTER TABLE public.recurring_sessions 
ADD COLUMN IF NOT EXISTS metodo_pagamento text DEFAULT 'A definir';