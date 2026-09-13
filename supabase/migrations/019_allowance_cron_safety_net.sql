-- Allowance scheduling safety net.
--
-- Allowances were driven solely by the hourly "Process Allowances" GitHub
-- Action, which calls the process-allowances edge function. GitHub disables
-- scheduled workflows after 60 days of repository inactivity, which silently
-- stopped all allowance payments between 2026-06-11 and 2026-09-13.
--
-- This schedules process_scheduled_allowances() inside the database so payments
-- no longer depend on repository activity. The edge function stays the primary
-- path because it also sends push notifications, so this job is offset to
-- minute 30 and normally finds nothing left to do. process_scheduled_allowances
-- locks each kid row with FOR UPDATE and advances last_allowance_date, so the
-- two schedules cannot double-pay.

CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'allowance-safety-net') THEN
    PERFORM cron.unschedule('allowance-safety-net');
  END IF;
END $$;

SELECT cron.schedule(
  'allowance-safety-net',
  '30 * * * *',
  $$SELECT public.process_scheduled_allowances();$$
);
