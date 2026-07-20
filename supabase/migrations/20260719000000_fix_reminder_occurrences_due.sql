-- Migration: Fix reminder_occurrences_due Schema and Dispatch Timing Bug

-- 1. Drop existing function to allow changing return signature (cascade drops dependent objects like invoke_dispatch_edge_function)
DROP FUNCTION IF EXISTS public.reminder_occurrences_due(timestamptz) CASCADE;

-- 2. Recreate reminder_occurrences_due with corrected user_settings us join and timezone reference, and <= for robust minute matching
CREATE OR REPLACE FUNCTION public.reminder_occurrences_due(run_time timestamptz)
RETURNS TABLE(
  reminder_item_id uuid,
  user_id uuid,
  channel channel_type,
  occurrence_date date,
  name text,
  notes text,
  custom_time time,
  timezone text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as reminder_item_id,
    r.user_id,
    p.channel,
    (run_time at time zone coalesce(us.timezone, 'UTC'))::date as occurrence_date,
    r.name,
    r.notes,
    p.custom_time,
    coalesce(us.timezone, 'UTC') as timezone
  FROM public.reminder_items r
  JOIN public.user_settings us ON us.user_id = r.user_id
  JOIN public.recurrence_rules rr ON rr.reminder_item_id = r.id
  JOIN public.notification_preferences p ON p.reminder_item_id = r.id
  WHERE p.enabled = true
    AND rr.next_occurrence_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.snooze_state ss
      WHERE ss.reminder_item_id = r.id
        AND ss.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        AND ss.snoozed_until > run_time
    )
    -- Using <= for robust minute matching to prevent missed reminders due to cron delays
    AND date_trunc('minute', (
      CASE
        WHEN p.lead_time = 'at_time' THEN rr.next_occurrence_at - (p.offset_days || ' days')::interval
        WHEN p.lead_time = 'morning_of' THEN ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '09:00:00') at time zone coalesce(us.timezone, 'UTC')
        WHEN p.lead_time = 'noon_of' THEN ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '12:00:00') at time zone coalesce(us.timezone, 'UTC')
        WHEN p.lead_time = 'evening_of' THEN ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '18:00:00') at time zone coalesce(us.timezone, 'UTC')
        WHEN p.lead_time = 'custom' THEN ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + coalesce(p.custom_time, time '09:00:00')) at time zone coalesce(us.timezone, 'UTC')
        ELSE rr.next_occurrence_at - (p.offset_days || ' days')::interval
      END
    )) <= date_trunc('minute', run_time)
    AND NOT EXISTS (
      SELECT 1 FROM public.delivery_log dl
      WHERE dl.reminder_item_id = r.id
        AND dl.channel = p.channel
        AND dl.status = 'sent'
        AND dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        AND dl.scheduled_for >= date_trunc('minute', run_time) - interval '1 minute'
    );
END;
$$;

-- 3. Recreate invoke_dispatch_edge_function since it was cascaded
CREATE OR REPLACE FUNCTION public.invoke_dispatch_edge_function()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  batch_payload jsonb;
  base_url text := nullif(trim(current_setting('app.settings.edge_function_base_url', true)), '');
  anon_key text := nullif(trim(current_setting('app.settings.anon_key', true)), '');
  edge_function_url text;
  request_id bigint;
BEGIN
  IF base_url IS NULL OR base_url = '' THEN
    RAISE EXCEPTION 'app.settings.edge_function_base_url is not configured';
  END IF;
  IF anon_key IS NULL OR anon_key = '' THEN
    RAISE EXCEPTION 'app.settings.anon_key is not configured';
  END IF;

  edge_function_url := base_url || '/dispatch-reminder';

  SELECT jsonb_agg(row_to_json(due))
  INTO batch_payload
  FROM public.reminder_occurrences_due(now()) due;

  IF batch_payload IS NOT NULL THEN
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('reminders', batch_payload)
    ) INTO request_id;

    INSERT INTO public.cron_dispatch_log (request_id, reminder_count, invoked_at)
    VALUES (request_id, jsonb_array_length(batch_payload), now());
  END IF;
END;
$$;

-- 4. Clean up legacy/deprecated cron job 'dispatch_engine' and procedure
SELECT cron.unschedule('dispatch_engine');
DROP PROCEDURE IF EXISTS public.trigger_dispatch_engine();
