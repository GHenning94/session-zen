-- Add payment method column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN metodo_pagamento TEXT DEFAULT 'dinheiro';

-- Add an index for better performance when filtering by payment method
CREATE INDEX idx_sessions_metodo_pagamento ON public.sessions(metodo_pagamento);