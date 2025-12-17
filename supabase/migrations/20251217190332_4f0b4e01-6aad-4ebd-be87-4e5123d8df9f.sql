-- Add metodo_pagamento column to packages table
ALTER TABLE public.packages 
ADD COLUMN metodo_pagamento text DEFAULT 'A definir';