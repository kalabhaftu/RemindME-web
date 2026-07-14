drop function if exists public.advance_reminder_occurrence(uuid);

create function public.advance_reminder_occurrence(p_reminder_item_id uuid)
returns void
language plpgsql security definer
as $$
declare
    rec public.recurrence_rules;
    next_time timestamptz;
begin
    select * into rec from public.recurrence_rules where reminder_item_id = p_reminder_item_id;

    if not found then
        -- No recurrence rules; mark as done by nullifying next_occurrence_at
        return;
    end if;

    if rec.frequency = 'none' then
        -- One-off. Nullify so the cron doesn't pick it up again.
        update public.recurrence_rules
        set next_occurrence_at = null
        where reminder_item_id = p_reminder_item_id;
        return;
    end if;

    -- Compute next occurrence based on frequency
    next_time := rec.next_occurrence_at;

    if rec.frequency = 'daily' then
        next_time := next_time + make_interval(days => rec.interval_count);
    elsif rec.frequency = 'weekly' then
        next_time := next_time + make_interval(weeks => rec.interval_count);
    elsif rec.frequency = 'monthly' then
        next_time := next_time + make_interval(months => rec.interval_count);
    elsif rec.frequency = 'yearly' then
        next_time := next_time + make_interval(years => rec.interval_count);
    elsif rec.frequency = 'custom_days' then
        next_time := next_time + make_interval(days => rec.interval_count);
    else
        -- Unknown frequency; nullify to stop
        update public.recurrence_rules
        set next_occurrence_at = null
        where reminder_item_id = p_reminder_item_id;
        return;
    end if;

    -- Handle end conditions
    if rec.ends = 'after_occurrences' then
        -- ends_value stores remaining occurrences count as text
        declare
            remaining int;
        begin
            remaining := (rec.ends_value::int) - 1;
            if remaining <= 0 then
                update public.recurrence_rules
                set next_occurrence_at = null
                where reminder_item_id = p_reminder_item_id;
                return;
            end if;
            update public.recurrence_rules
            set next_occurrence_at = next_time,
                ends_value = remaining::text
            where reminder_item_id = p_reminder_item_id;
        end;
    elsif rec.ends = 'on_date' then
        if next_time > rec.ends_value::timestamptz then
            update public.recurrence_rules
            set next_occurrence_at = null
            where reminder_item_id = p_reminder_item_id;
            return;
        end if;
        update public.recurrence_rules
        set next_occurrence_at = next_time
        where reminder_item_id = p_reminder_item_id;
    else
        -- ends = 'never'
        update public.recurrence_rules
        set next_occurrence_at = next_time
        where reminder_item_id = p_reminder_item_id;
    end if;
end;
$$;
