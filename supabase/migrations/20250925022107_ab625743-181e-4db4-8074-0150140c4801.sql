-- Add avatar_url column to clients table
ALTER TABLE public.clients 
ADD COLUMN avatar_url TEXT;

-- Update existing clients to have null avatar_url (no default needed as it's already nullable)