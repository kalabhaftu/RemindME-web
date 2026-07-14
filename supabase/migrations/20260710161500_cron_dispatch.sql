-- Enable pg_net for HTTP requests to Edge Functions
create extension if not exists pg_net;

-- Function to find due reminders
create or replace function public.reminder_occurrences_due(run_time timestamptz)
returns table(
  reminder_item_id uuid,
  user_id uuid,
  channel channel_type,
  occurrence_date date,
  name text,
  custom_time time,
  timezone text
)
language plpgsql security definer
as $$
begin
  return query
  select 
    r.id as reminder_item_id,
    r.user_id,
    p.channel,
    -- Simple cast for now; robust timezone resolution happens via timezone field
    (run_time at time zone u.timezone)::date as occurrence_date,
    r.name,
    p.custom_time,
    u.timezone
  from public.reminder_items r
  join auth.users u on u.id = r.user_id
  join public.recurrence_rules rr on rr.reminder_item_id = r.id
  join public.notification_preferences p on p.reminder_item_id = r.id
  where p.enabled = true
    -- Ensure it's the exact minute
    and date_trunc('minute', rr.next_occurrence_at) = date_trunc('minute', run_time)
    -- Ensure we haven't already logged a dispatch for this specific item/channel/date
    and not exists (
      select 1 from public.delivery_log dl 
      where dl.reminder_item_id = r.id 
        and dl.channel = p.channel 
        and dl.occurrence_date = (run_time at time zone u.timezone)::date
    );
end;
$$;

-- Function to trigger the Edge Function via pg_net
create or replace function public.invoke_dispatch_edge_function()
returns void
language plpgsql security definer
as $$
declare
  batch_payload jsonb;
  edge_function_url text := current_setting('app.settings.edge_function_base_url', true) || '/dispatch-reminder';
  anon_key text := current_setting('app.settings.anon_key', true);
begin
  -- Gather due reminders into a JSON array
  select jsonb_agg(row_to_json(due))
  into batch_payload
  from public.reminder_occurrences_due(now()) due;

  if batch_payload is not null then
    perform net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('reminders', batch_payload)
    );
  end if;
end;
$$;

-- Schedule the cron job to run every minute
select cron.schedule(
  'invoke-reminder-dispatch',
  '* * * * *',
  $$ select public.invoke_dispatch_edge_function(); $$
);
