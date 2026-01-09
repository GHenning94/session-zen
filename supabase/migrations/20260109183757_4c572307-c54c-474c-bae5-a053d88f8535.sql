-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the automatic payout job to run on the 15th of every month at 9:00 AM UTC
SELECT cron.schedule(
  'process-referral-payouts-monthly',
  '0 9 15 * *', -- At 09:00 on day 15 of every month
  $$
  SELECT
    net.http_post(
      url := 'https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/process-referral-payouts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) AS request_id;
  $$
);

-- Add a comment documenting the cron job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automatic referral payouts on the 15th of each month';