-- Drop existing constraint and recreate with all valid Portuguese values
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_google_sync_type_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_google_sync_type_check 
  CHECK (google_sync_type IS NULL OR google_sync_type = ANY (ARRAY['local', 'importado', 'espelhado', 'enviado', 'ignorado', 'cancelado']::text[]));