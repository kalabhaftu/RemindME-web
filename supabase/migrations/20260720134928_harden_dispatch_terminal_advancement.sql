create or replace function public.reminder_occurrences_due(run_time timestamptz)
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

create or replace function public.reminder_occurrence_all_channels_terminal(
  p_reminder_item_id uuid,
  p_occurrence_date date
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notification_preferences np
    where np.reminder_item_id = p_reminder_item_id
      and np.enabled
  )
  and not exists (
    select 1
    from public.notification_preferences np
    where np.reminder_item_id = p_reminder_item_id
      and np.enabled
      and not (
        exists (
          select 1
          from public.delivery_log dl
          where dl.reminder_item_id = p_reminder_item_id
            and dl.channel = np.channel
            and dl.occurrence_date = p_occurrence_date
            and dl.status in ('sent', 'skipped')
        )
        or (
          select count(*)
          from public.delivery_log dl
          where dl.reminder_item_id = p_reminder_item_id
            and dl.channel = np.channel
            and dl.occurrence_date = p_occurrence_date
            and dl.status = 'failed'
        ) >= 3
      )
  );
$$;

revoke execute on function public.reminder_occurrence_all_channels_terminal(uuid, date) from public, anon, authenticated;
grant execute on function public.reminder_occurrence_all_channels_terminal(uuid, date) to postgres, service_role;

create or replace function public.advance_terminal_reminder_occurrences(run_time timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  advanced_count integer := 0;
begin
  for rec in
    select
      rr.reminder_item_id,
      (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date as occurrence_date
    from public.recurrence_rules rr
    join public.reminder_items ri on ri.id = rr.reminder_item_id
    left join public.user_settings us on us.user_id = ri.user_id
    where rr.next_occurrence_at is not null
      and exists (
        select 1
        from public.delivery_log dl
        where dl.reminder_item_id = rr.reminder_item_id
          and dl.occurrence_date = (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date
      )
      and public.reminder_occurrence_all_channels_terminal(
        rr.reminder_item_id,
        (rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date
      )
  loop
    perform public.advance_reminder_occurrence(rec.reminder_item_id);
    advanced_count := advanced_count + 1;
  end loop;

  return advanced_count;
end;
$$;

revoke execute on function public.advance_terminal_reminder_occurrences(timestamptz) from public, anon, authenticated;
grant execute on function public.advance_terminal_reminder_occurrences(timestamptz) to postgres, service_role;
