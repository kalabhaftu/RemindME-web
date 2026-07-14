drop function if exists public.reminders_needing_nudge();

create function public.reminders_needing_nudge()
returns table(
    reminder_item_id uuid,
    user_id uuid,
    channel channel_type,
    occurrence_date date,
    name text,
    notes text
)
language plpgsql security definer
as $$
begin
    return query
    select
        es.reminder_item_id,
        ri.user_id,
        np.channel,
        es.occurrence_date,
        ri.name,
        ri.notes
    from public.escalation_state es
    join public.reminder_items ri on ri.id = es.reminder_item_id
    join public.user_settings us on us.user_id = ri.user_id
    join public.notification_preferences np on np.reminder_item_id = ri.id and np.enabled = true
    where ri.category = 'task'
        and es.first_notified_at is not null
        and es.marked_done_at is null
        and es.nudge_sent_at is null
        and es.first_notified_at + (us.nudge_delay_hours || ' hours')::interval <= now();
end;
$$;
