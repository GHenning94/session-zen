-- Add google_sync_type enum values to sessions table if not already present
-- The column already exists, we just need to ensure it can hold the new values

-- Add google_ignored column to track ignored events
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_ignored boolean DEFAULT false;

-- Add google_attendees column to store participant info
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_attendees jsonb DEFAULT '[]'::jsonb;

-- Add google_location column 
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_location text;

-- Add google_html_link column for direct link to Google event
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_html_link text;

-- Add google_recurrence_id for recurring event instances
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_recurrence_id text;

-- Add google_last_synced timestamp
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_last_synced timestamp with time zone;

-- Create index for faster Google Calendar queries
CREATE INDEX IF NOT EXISTS idx_sessions_google_event_id ON public.sessions(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_google_sync_type ON public.sessions(google_sync_type) WHERE google_sync_type IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN public.sessions.google_sync_type IS 'Sync type: local, imported, mirrored, sent, ignored';
COMMENT ON COLUMN public.sessions.google_ignored IS 'Whether this Google event was ignored by user';
COMMENT ON COLUMN public.sessions.google_attendees IS 'JSON array of event attendees from Google';
COMMENT ON COLUMN public.sessions.google_location IS 'Event location from Google Calendar';
COMMENT ON COLUMN public.sessions.google_html_link IS 'Direct link to event in Google Calendar';
COMMENT ON COLUMN public.sessions.google_recurrence_id IS 'Recurrence ID for recurring event instances';
COMMENT ON COLUMN public.sessions.google_last_synced IS 'Last time this event was synced with Google';