-- Drop the notify_new_booking trigger that creates notifications for ALL sessions
-- External sessions already create notifications via edge functions (create-public-booking)
-- This prevents duplicate notifications and stops notifications for platform-created sessions

DROP TRIGGER IF EXISTS trigger_notify_new_booking ON public.sessions;

-- Keep the function for reference but it won't be called anymore
-- Notifications for external bookings are handled by edge functions:
-- - create-public-booking/index.ts for sessions
-- - register-client-via-token/index.ts for clients