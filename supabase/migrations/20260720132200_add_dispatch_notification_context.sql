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
  lead_time text
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
    (run_time at time zone coalesce(us.timezone, 'UTC'))::date,
    r.name,
    r.notes,
    p.custom_time,
    coalesce(us.timezone, 'UTC'),
    r.category::text,
    rr.next_occurrence_at,
    p.lead_time::text
  from public.reminder_items r
  left join public.user_settings us on us.user_id = r.user_id
  join public.recurrence_rules rr on rr.reminder_item_id = r.id
  join public.notification_preferences p on p.reminder_item_id = r.id
  where p.enabled
    and rr.next_occurrence_at is not null
    and not exists (
      select 1
      from public.snooze_state ss
      where ss.reminder_item_id = r.id
        and ss.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
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
      select 1
      from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.status = 'sent'
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.scheduled_for >= date_trunc('minute', run_time) - interval '1 minute'
    );
end;
$$;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;
