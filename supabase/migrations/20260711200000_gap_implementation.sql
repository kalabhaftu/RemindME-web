-- Gap implementation schema additions

-- Person avatar
alter table public.person_details
  add column if not exists avatar_url text;

-- Subscription logo cache key + brand color
alter table public.subscription_details
  add column if not exists logo_domain text;

-- Task priority
do $$ begin
  create type task_priority as enum('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

alter table public.task_details
  add column if not exists priority task_priority not null default 'medium';

-- Multiple lead-time offsets per channel
alter table public.notification_preferences
  add column if not exists offset_days int not null default 0;

-- Telegram chat ID (encrypted, separate from bot token)
alter table public.notification_channels
  add column if not exists chat_id_encrypted text;

-- Holiday subscriptions
create table if not exists public.holiday_details (
  reminder_item_id uuid primary key references public.reminder_items(id) on delete cascade,
  country_code text not null default 'US',
  holiday_key text,
  holiday_date date,
  is_custom boolean not null default false
);

alter table public.holiday_details enable row level security;

create policy "Users can manage their holiday details"
on public.holiday_details for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

-- Snooze state
create table if not exists public.snooze_state (
  reminder_item_id uuid not null references public.reminder_items(id) on delete cascade,
  occurrence_date date not null,
  snoozed_until timestamptz not null,
  primary key (reminder_item_id, occurrence_date)
);

alter table public.snooze_state enable row level security;

create policy "Users can manage their snooze state"
on public.snooze_state for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

-- Updated reminder_occurrences_due with lead_time presets and offset_days
drop function if exists public.reminder_occurrences_due(run_time timestamptz);

create or replace function public.reminder_occurrences_due(run_time timestamptz)
returns table(
  reminder_item_id uuid,
  user_id uuid,
  channel channel_type,
  occurrence_date date,
  name text,
  notes text,
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
    (run_time at time zone coalesce(us.timezone, 'UTC'))::date as occurrence_date,
    r.name,
    r.notes,
    p.custom_time,
    coalesce(us.timezone, 'UTC') as timezone
  from public.reminder_items r
  join public.user_settings us on us.user_id = r.user_id
  join public.recurrence_rules rr on rr.reminder_item_id = r.id
  join public.notification_preferences p on p.reminder_item_id = r.id
  where p.enabled = true
    and rr.next_occurrence_at is not null
    and not exists (
      select 1 from public.snooze_state ss
      where ss.reminder_item_id = r.id
        and ss.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and ss.snoozed_until > run_time
    )
    and date_trunc('minute', (
      case
        when p.lead_time = 'at_time' then rr.next_occurrence_at - (p.offset_days || ' days')::interval
        when p.lead_time = 'morning_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '09:00:00') at time zone coalesce(us.timezone, 'UTC')
        when p.lead_time = 'noon_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '12:00:00') at time zone coalesce(us.timezone, 'UTC')
        when p.lead_time = 'evening_of' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + time '18:00:00') at time zone coalesce(us.timezone, 'UTC')
        when p.lead_time = 'custom' then ((rr.next_occurrence_at at time zone coalesce(us.timezone, 'UTC'))::date - p.offset_days + coalesce(p.custom_time, time '09:00:00')) at time zone coalesce(us.timezone, 'UTC')
        else rr.next_occurrence_at - (p.offset_days || ' days')::interval
      end
    )) = date_trunc('minute', run_time)
    and not exists (
      select 1 from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.scheduled_for >= date_trunc('minute', run_time) - interval '1 minute'
    );
end;
$$;

-- Push-only nudge
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
    'push'::channel_type as channel,
    es.occurrence_date,
    ri.name,
    ri.notes
  from public.escalation_state es
  join public.reminder_items ri on ri.id = es.reminder_item_id
  join public.user_settings us on us.user_id = ri.user_id
  where ri.category = 'task'
    and es.first_notified_at is not null
    and es.marked_done_at is null
    and es.nudge_sent_at is null
    and es.first_notified_at + (us.nudge_delay_hours || ' hours')::interval <= now()
    and exists (
      select 1 from public.notification_preferences np
      where np.reminder_item_id = ri.id and np.channel = 'push' and np.enabled = true
    );
end;
$$;
