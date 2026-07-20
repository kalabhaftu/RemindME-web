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
        from public.notification_preferences np
        where np.reminder_item_id = rr.reminder_item_id
          and np.enabled
          and date_trunc('minute', case
            when np.lead_time = 'at_time' then rr.next_occurrence_at - (np.offset_days || ' days')::interval
            when np.lead_time = 'morning_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - np.offset_days + time '09:00') at time zone coalesce(us.timezone, 'UTC')
            when np.lead_time = 'noon_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - np.offset_days + time '12:00') at time zone coalesce(us.timezone, 'UTC')
            when np.lead_time = 'evening_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - np.offset_days + time '18:00') at time zone coalesce(us.timezone, 'UTC')
            when np.lead_time = 'custom' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - np.offset_days + coalesce(np.custom_time, time '09:00')) at time zone coalesce(us.timezone, 'UTC')
            else rr.next_occurrence_at - (np.offset_days || ' days')::interval
          end) <= date_trunc('minute', run_time)
      )
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
