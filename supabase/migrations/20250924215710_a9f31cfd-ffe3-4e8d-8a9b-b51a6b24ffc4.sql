-- Add active status column to clients table
ALTER TABLE public.clients 
ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- Add index for better performance when filtering by active status  
CREATE INDEX idx_clients_ativo ON public.clients(ativo);

-- Update trigger to set updated_at when status changes
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for clients table
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();