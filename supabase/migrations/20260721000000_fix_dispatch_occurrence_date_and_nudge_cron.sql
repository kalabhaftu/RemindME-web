-- Fix 1: Revert `run_time` back to `rr.next_occurrence_at` for occurrence_date resolution.
-- A previous migration (20260720150000_add_dispatch_details_context) incorrectly changed the occurrence_date
-- calculation to use `run_time` instead of `rr.next_occurrence_at`. Since reminders are dispatched early
-- based on offset_days, this caused the delivery log and snooze state to save the wrong occurrence date
-- (the day it ran, not the day it was due). This broke the terminal advancement logic, causing it to stall
-- (it would never see a delivery log for the actual occurrence date, so it kept sending until it finally hit it).
drop function if exists public.reminder_occurrences_due(timestamptz);

create function public.reminder_occurrences_due(run_time timestamptz)
returns table(
  reminder_item_id uuid,
  user_id uuid,
  channel channel_type,
  occurrence_date date,
  name text,
  notes text,
  custom_time time,
  timezone text,
  category text,
  event_at timestamptz,
  lead_time text,
  details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id,
    r.user_id,
    p.channel,
    (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date,
    r.name,
    r.notes,
    p.custom_time,
    coalesce(us.timezone, 'UTC'),
    r.category::text,
    rr.next_occurrence_at,
    p.lead_time::text,
    jsonb_strip_nulls(jsonb_build_object(
      'billing_amount', sd.billing_amount,
      'billing_currency', sd.billing_currency,
      'cycle', sd.cycle,
      'renewal_date', sd.renewal_date,
      'birthdate', pd.birthdate,
      'relationship', pd.relationship,
      'due_at', td.due_at,
      'holiday_date', hd.holiday_date,
      'country_code', hd.country_code
    ))
  from public.reminder_items r
  left join public.user_settings us on us.user_id = r.user_id
  join public.recurrence_rules rr on rr.reminder_item_id = r.id
  join public.notification_preferences p on p.reminder_item_id = r.id
  left join public.subscription_details sd on sd.reminder_item_id = r.id
  left join public.person_details pd on pd.reminder_item_id = r.id
  left join public.task_details td on td.reminder_item_id = r.id
  left join public.holiday_details hd on hd.reminder_item_id = r.id
  where p.enabled
    and rr.next_occurrence_at is not null
    and not exists (
      select 1 from public.snooze_state ss
      where ss.reminder_item_id = r.id
        and ss.occurrence_date = (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date
        and ss.snoozed_until > run_time
    )
    and date_trunc('minute', case
      when p.lead_time = 'at_time' then rr.next_occurrence_at - (p.offset_days || ' days')::interval
      when p.lead_time = 'morning_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '09:00') at time zone coalesce(us.timezone, 'UTC')
      when p.lead_time = 'noon_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '12:00') at time zone coalesce(us.timezone, 'UTC')
      when p.lead_time = 'evening_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '18:00') at time zone coalesce(us.timezone, 'UTC')
      when p.lead_time = 'custom' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + coalesce(p.custom_time, time '09:00')) at time zone coalesce(us.timezone, 'UTC')
      else rr.next_occurrence_at - (p.offset_days || ' days')::interval
    end) <= date_trunc('minute', run_time)
    and not exists (
      select 1 from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.status in ('sent', 'skipped')
    )
    and (
      select count(*) from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.status = 'failed'
    ) < 3;
end;
$$;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;

-- Fix 2: Add missing INSERT policy for in_app_notifications
create policy "Users can insert own in-app notifications"
on public.in_app_notifications for insert
with check (auth.uid() = user_id);

-- Fix 3: Create nudge dispatch edge function invoker and schedule it
create or replace function public.invoke_dispatch_nudge_edge_function()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  base_url text := nullif(trim(current_setting('app.settings.edge_function_base_url', true)), '');
  anon_key text := nullif(trim(current_setting('app.settings.anon_key', true)), '');
  edge_function_url text;
  request_id bigint;
begin
  if base_url is null or base_url = '' then
    raise exception 'app.settings.edge_function_base_url is not configured';
  end if;
  if anon_key is null or anon_key = '' then
    raise exception 'app.settings.anon_key is not configured';
  end if;

  edge_function_url := base_url || '/dispatch-nudge';

  select net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb
  ) into request_id;
end;
$$;

select cron.schedule(
  'invoke-nudge-dispatch',
  '* * * * *',
  $$ select public.invoke_dispatch_nudge_edge_function(); $$
);
