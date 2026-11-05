-- =============================================
-- Migration: 20240101000002_create_logos_bucket.sql
-- =============================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "Public access to logos" on storage.objects;
create policy "Public access to logos"
on storage.objects for select
to public
using ( bucket_id = 'logos' );

drop policy if exists "Authenticated users can upload logos" on storage.objects;
create policy "Authenticated users can upload logos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'logos' );


-- =============================================
-- Migration: 20260710160000_init_schema.sql
-- =============================================

-- Migration: Init Schema

-- Enable pg_cron extension if not enabled
create extension if not exists pg_cron;

-- Set up custom types
create type category_type as enum('person', 'subscription', 'task', 'custom_holiday');
create type relationship_type as enum('family', 'partner', 'friend', 'colleague', 'other');
create type gender_type as enum('male', 'female', 'nonbinary', 'unspecified');
create type cycle_type as enum('weekly', 'monthly', 'yearly', 'custom_days');
create type frequency_type as enum('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom_days');
create type ends_type as enum('never', 'after_occurrences', 'on_date');
create type channel_type as enum('email', 'push', 'telegram', 'in_app');
create type lead_time_type as enum('at_time', 'morning_of', 'noon_of', 'evening_of', 'custom');
create type delivery_status as enum('sent', 'failed', 'skipped');

-- Table: reminder_items
create table public.reminder_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category category_type not null,
    name text not null,
    icon_key text,
    color_accent text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz
);

-- Table: person_details
create table public.person_details (
    reminder_item_id uuid primary key references public.reminder_items(id) on delete cascade,
    birthdate date,
    relationship relationship_type,
    gender gender_type
);

-- Table: subscription_details
create table public.subscription_details (
    reminder_item_id uuid primary key references public.reminder_items(id) on delete cascade,
    logo_url text,
    billing_amount numeric,
    billing_currency text,
    renewal_date date,
    cycle cycle_type
);

-- Table: task_details
create table public.task_details (
    reminder_item_id uuid primary key references public.reminder_items(id) on delete cascade,
    due_at timestamptz
);

-- Table: recurrence_rules
create table public.recurrence_rules (
    reminder_item_id uuid primary key references public.reminder_items(id) on delete cascade,
    frequency frequency_type not null,
    interval_count int not null default 1,
    ends ends_type not null default 'never',
    ends_value text, -- can store int (occurrences) or ISO date string
    next_occurrence_at timestamptz
);
create index idx_recurrence_rules_next_occurrence on public.recurrence_rules(next_occurrence_at);

-- Table: notification_preferences
create table public.notification_preferences (
    id uuid primary key default gen_random_uuid(),
    reminder_item_id uuid not null references public.reminder_items(id) on delete cascade,
    channel channel_type not null,
    enabled boolean not null default true,
    lead_time lead_time_type not null default 'at_time',
    custom_time time
);
create index idx_notification_prefs_item on public.notification_preferences(reminder_item_id);

-- Table: notification_channels
create table public.notification_channels (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    channel channel_type not null,
    encrypted_token text,
    verified_at timestamptz,
    last_test_at timestamptz,
    label text,
    unique (user_id, channel)
);

-- Table: delivery_log
create table public.delivery_log (
    id uuid primary key default gen_random_uuid(),
    reminder_item_id uuid not null references public.reminder_items(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    channel channel_type not null,
    status delivery_status not null,
    scheduled_for timestamptz not null,
    sent_at timestamptz,
    error_message text,
    occurrence_date date not null
);

-- Table: escalation_state
create table public.escalation_state (
    reminder_item_id uuid not null references public.reminder_items(id) on delete cascade,
    occurrence_date date not null,
    first_notified_at timestamptz,
    marked_done_at timestamptz,
    nudge_sent_at timestamptz,
    primary key (reminder_item_id, occurrence_date)
);

-- Row Level Security
alter table public.reminder_items enable row level security;
alter table public.person_details enable row level security;
alter table public.subscription_details enable row level security;
alter table public.task_details enable row level security;
alter table public.recurrence_rules enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_channels enable row level security;
alter table public.delivery_log enable row level security;
alter table public.escalation_state enable row level security;

-- Policies for reminder_items
create policy "Users can manage their own reminder items"
on public.reminder_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policies for joined details (using reminder_items.user_id)
create policy "Users can manage their person details"
on public.person_details for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

create policy "Users can manage their subscription details"
on public.subscription_details for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

create policy "Users can manage their task details"
on public.task_details for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

create policy "Users can manage recurrence rules"
on public.recurrence_rules for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

create policy "Users can manage notification preferences"
on public.notification_preferences for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

-- Policies for user-specific channels and logs
create policy "Users can manage their notification channels"
on public.notification_channels for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can view their delivery logs"
on public.delivery_log for select
using (auth.uid() = user_id);

create policy "Users can view their escalation states"
on public.escalation_state for all
using (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()))
with check (exists (select 1 from public.reminder_items where id = reminder_item_id and user_id = auth.uid()));

-- Table: user_settings
create table public.user_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    nudge_delay_hours integer not null default 4,
    timezone text not null default 'UTC',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
on public.user_settings for select
using (auth.uid() = user_id);

create policy "Users can update own settings"
on public.user_settings for update
using (auth.uid() = user_id);

create policy "Users can insert own settings"
on public.user_settings for insert
with check (auth.uid() = user_id);


-- =============================================
-- Migration: 20260710161500_cron_dispatch.sql
-- =============================================

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


-- =============================================
-- Migration: 20260710162000_enable_realtime.sql
-- =============================================

-- Enable realtime for tables
alter publication supabase_realtime add table reminder_items;
alter publication supabase_realtime add table escalation_state;
alter publication supabase_realtime add table task_details;
alter publication supabase_realtime add table person_details;
alter publication supabase_realtime add table subscription_details;
alter publication supabase_realtime add table recurrence_rules;


-- =============================================
-- Migration: 20260711170000_add_settings_columns.sql
-- =============================================

alter table public.user_settings
  add column if not exists default_channels jsonb not null default '{"email": true, "push": false, "telegram": false, "in_app": true}'::jsonb,
  add column if not exists default_lead_time text not null default 'morning_of',
  add column if not exists default_custom_time text not null default '09:00';


-- =============================================
-- Migration: 20260711180000_session_timeout.sql
-- =============================================

-- Set 30-day session expiration in Supabase Auth
-- Run this in Supabase SQL Editor:
-- UPDATE auth.config SET session_expiry = 2592000 WHERE id = (SELECT id FROM auth.config LIMIT 1);
--
-- Or set via Dashboard: Authentication > Settings > Session duration > 30 days

-- Attempt to set via built-in config function
select set_config('auth.session_expiry', '2592000', false);


-- =============================================
-- Migration: 20260711190000_multi_device_push.sql
-- =============================================

-- Drop the original unique constraint
ALTER TABLE public.notification_channels DROP CONSTRAINT IF EXISTS notification_channels_user_id_channel_key;

-- Recreate unique constraint/index for non-push channels (enforces 1 token per channel per user)
CREATE UNIQUE INDEX IF NOT EXISTS notification_channels_user_id_channel_key
ON public.notification_channels (user_id, channel)
WHERE (channel != 'push');

-- Create unique constraint/index for push channel (enforces unique token per device, allows multiple devices per user)
CREATE UNIQUE INDEX IF NOT EXISTS notification_channels_user_id_channel_token_key
ON public.notification_channels (user_id, channel, encrypted_token)
WHERE (channel = 'push');


-- =============================================
-- Migration: 20260711195500_in_app_notifications.sql
-- =============================================

create table public.in_app_notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    reminder_item_id uuid references public.reminder_items(id) on delete set null,
    title text not null,
    body text,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_in_app_notifications_user on public.in_app_notifications(user_id, read_at, created_at desc);

alter table public.in_app_notifications enable row level security;

create policy "Users can view own in-app notifications"
on public.in_app_notifications for select
using (auth.uid() = user_id);

create policy "Users can update own in-app notifications"
on public.in_app_notifications for update
using (auth.uid() = user_id);

alter publication supabase_realtime add table public.in_app_notifications;


-- =============================================
-- Migration: 20260711195600_advance_reminder_occurrence.sql
-- =============================================

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


-- =============================================
-- Migration: 20260711195700_reminders_needing_nudge.sql
-- =============================================

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


-- =============================================
-- Migration: 20260711195800_reminder_templates.sql
-- =============================================

create table public.reminder_templates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    category category_type not null,
    icon_key text,
    color_accent text,
    notes_template text,
    recurrence_frequency frequency_type default 'none',
    recurrence_ends ends_type default 'never',
    default_lead_time lead_time_type default 'at_time',
    default_channels text[] default array['in_app'],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.reminder_templates enable row level security;

create policy "Users can manage own templates"
on public.reminder_templates for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- =============================================
-- Migration: 20260711200000_gap_implementation.sql
-- =============================================

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


-- =============================================
-- Migration: 20260712220000_add_missing_detail_columns.sql
-- =============================================

alter table public.person_details add column if not exists custom_relationship text;
alter table public.subscription_details add column if not exists logo_domain text;


-- =============================================
-- Migration: 20260713010000_logo_domain.sql
-- =============================================

alter table public.subscription_details add column if not exists logo_domain text;


-- =============================================
-- Migration: 20260714120000_fix_cron_dispatch_settings.sql
-- =============================================

-- FIX: invoke_dispatch_edge_function() silently no-ops forever.
--
-- Root cause: app.settings.edge_function_base_url and app.settings.anon_key
-- were referenced via current_setting(..., true) but never actually SET
-- anywhere (no ALTER DATABASE / ALTER ROLE / vault entry in this repo).
-- missing_ok=true means current_setting() returns NULL instead of raising,
-- and NULL || '/dispatch-reminder' evaluates to NULL in Postgres. So every
-- cron tick built a NULL request URL, net.http_post() queued a request that
-- could never resolve, and the return value was discarded (`perform ...`),
-- so the failure was invisible everywhere -- no error in the cron job, no
-- error in the client, no error in the app.
--
-- Fix: set the GUCs at the database level (REQUIRED - fill in your real
-- values before/after running this migration), and make the function fail
-- loudly instead of silently if they're ever unset again.

-- 1) Actually set the settings. Replace the placeholders with your project's
--    real values (Project Settings -> API in the Supabase dashboard), then
--    run this once against your database (psql / SQL editor), or keep it
--    here and re-run `supabase db push`.
--    NOTE: 'anon_key' is fine for calling an Edge Function that itself uses
--    the service role key internally (which dispatch-reminder does), but if
--    you'd rather not store a key in a GUC at all, use Supabase Vault
--    instead (see commented alternative below).
-- 2) Harden the function so a missing/blank setting throws instead of
--    silently building a NULL URL and swallowing the failure.
create or replace function public.invoke_dispatch_edge_function()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  batch_payload jsonb;
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

  edge_function_url := base_url || '/dispatch-reminder';

  select jsonb_agg(row_to_json(due))
  into batch_payload
  from public.reminder_occurrences_due(now()) due;

  if batch_payload is not null then
    select net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('reminders', batch_payload)
    ) into request_id;

    -- Keep a trail so failures are visible without digging through
    -- net._http_response manually.
    insert into public.cron_dispatch_log (request_id, reminder_count, invoked_at)
    values (request_id, jsonb_array_length(batch_payload), now());
  end if;
end;
$$;

-- 3) Minimal audit table so you can SELECT * FROM cron_dispatch_log and see
--    whether the cron tick even attempted a call, and cross-reference
--    request_id against net._http_response for the actual HTTP outcome.
create table if not exists public.cron_dispatch_log (
  id bigint generated always as identity primary key,
  request_id bigint,
  reminder_count int not null default 0,
  invoked_at timestamptz not null default now()
);


-- =============================================
-- Migration: 20260715120000_create_avatars_bucket.sql
-- =============================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public access to avatars" on storage.objects;
create policy "Public access to avatars"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' );


-- =============================================
-- Migration: 20260719000000_fix_reminder_occurrences_due.sql
-- =============================================

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


-- =============================================
-- Migration: 20260720053759_harden_dispatch_configuration.sql
-- =============================================

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
    coalesce(us.timezone, 'UTC')
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

alter function public.advance_reminder_occurrence(uuid) set search_path = public;

alter function public.reminders_needing_nudge() set search_path = public;

create or replace function public.invoke_dispatch_edge_function()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_payload jsonb;
  base_url text := nullif(trim(current_setting('app.settings.edge_function_base_url', true)), '');
  anon_key text := nullif(trim(current_setting('app.settings.anon_key', true)), '');
  request_id bigint;
begin
  if base_url is null or base_url !~ '^https://[^/]+/functions/v1$' then
    raise exception 'app.settings.edge_function_base_url must be set to https://<project-ref>.supabase.co/functions/v1';
  end if;
  if anon_key is null then
    raise exception 'app.settings.anon_key is not configured';
  end if;

  select jsonb_agg(row_to_json(due))
  into batch_payload
  from public.reminder_occurrences_due(now()) due;

  if batch_payload is not null then
    select net.http_post(
      url := base_url || '/dispatch-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('reminders', batch_payload)
    ) into request_id;

    insert into public.cron_dispatch_log (request_id, reminder_count, invoked_at)
    values (request_id, jsonb_array_length(batch_payload), now());
  end if;
end;
$$;


-- =============================================
-- Migration: 20260720061001_use_vault_dispatch_configuration.sql
-- =============================================

create or replace function public.invoke_dispatch_edge_function()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_payload jsonb;
  base_url text;
  anon_key text;
  edge_function_url text;
  request_id bigint;
begin
  select coalesce(
    nullif(trim(current_setting('app.settings.edge_function_base_url', true)), ''),
    (
      select nullif(trim(decrypted_secret), '')
      from vault.decrypted_secrets
      where name = 'dispatch_edge_function_base_url'
      limit 1
    )
  ) into base_url;

  select coalesce(
    nullif(trim(current_setting('app.settings.anon_key', true)), ''),
    (
      select nullif(trim(decrypted_secret), '')
      from vault.decrypted_secrets
      where name = 'dispatch_anon_key'
      limit 1
    )
  ) into anon_key;

  if base_url is null or base_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/?$' then
    raise exception 'dispatch Edge Function base URL is not configured';
  end if;

  if anon_key is null then
    raise exception 'dispatch anon key is not configured';
  end if;

  edge_function_url := rtrim(base_url, '/') || '/dispatch-reminder';

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into batch_payload
  from public.reminder_occurrences_due(now()) x;

  if batch_payload = '[]'::jsonb then
    return;
  end if;

  select net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('items', batch_payload),
    timeout_milliseconds := 10000
  )
  into request_id;

  insert into public.in_app_notifications(user_id, type, title, body, data, read)
  select distinct
    (item->>'user_id')::uuid,
    'dispatch_queued',
    'Reminder dispatch queued',
    'Dispatch request ' || request_id::text || ' queued for delivery.',
    jsonb_build_object('request_id', request_id),
    true
  from jsonb_array_elements(batch_payload) item
  where item ? 'user_id';
end;
$$;


-- =============================================
-- Migration: 20260720102000_fix_dispatch_queue_audit.sql
-- =============================================

create or replace function public.invoke_dispatch_edge_function()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_payload jsonb;
  base_url text;
  anon_key text;
  request_id bigint;
begin
  select coalesce(
    nullif(trim(current_setting('app.settings.edge_function_base_url', true)), ''),
    (select nullif(trim(decrypted_secret), '')
     from vault.decrypted_secrets
     where name = 'dispatch_edge_function_base_url'
     limit 1)
  ) into base_url;

  select coalesce(
    nullif(trim(current_setting('app.settings.anon_key', true)), ''),
    (select nullif(trim(decrypted_secret), '')
     from vault.decrypted_secrets
     where name = 'dispatch_anon_key'
     limit 1)
  ) into anon_key;

  if base_url is null or base_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/?$' then
    raise exception 'dispatch Edge Function base URL is not configured';
  end if;
  if anon_key is null then
    raise exception 'dispatch anon key is not configured';
  end if;

  select coalesce(jsonb_agg(to_jsonb(due)), '[]'::jsonb)
  into batch_payload
  from public.reminder_occurrences_due(now()) due;

  if batch_payload = '[]'::jsonb then
    return;
  end if;

  select net.http_post(
    url := rtrim(base_url, '/') || '/dispatch-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('items', batch_payload),
    timeout_milliseconds := 10000
  ) into request_id;

  insert into public.cron_dispatch_log(request_id, reminder_count)
  values (request_id, jsonb_array_length(batch_payload));
end;
$$;

revoke execute on function public.invoke_dispatch_edge_function() from public;
grant execute on function public.invoke_dispatch_edge_function() to postgres;


-- =============================================
-- Migration: 20260720103500_dedupe_skipped_dispatches.sql
-- =============================================

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
    coalesce(us.timezone, 'UTC')
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
        and dl.status in ('sent', 'skipped')
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
    );
end;
$$;


-- =============================================
-- Migration: 20260720105000_harden_dispatch_function_permissions.sql
-- =============================================

revoke execute on function public.invoke_dispatch_edge_function() from public, anon, authenticated, service_role;
grant execute on function public.invoke_dispatch_edge_function() to postgres;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;

revoke execute on function public.reminders_needing_nudge() from public, anon, authenticated;
grant execute on function public.reminders_needing_nudge() to postgres, service_role;

revoke execute on function public.advance_reminder_occurrence(uuid) from public, anon, authenticated;
grant execute on function public.advance_reminder_occurrence(uuid) to postgres, service_role;

revoke execute on function public.trigger_nudge_engine() from public, anon, authenticated, service_role;
grant execute on function public.trigger_nudge_engine() to postgres;
alter function public.trigger_nudge_engine() set search_path = public;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;
grant execute on function public.rls_auto_enable() to postgres;


-- =============================================
-- Migration: 20260720110000_remove_public_storage_listing_policies.sql
-- =============================================

drop policy if exists "Public access to avatars" on storage.objects;
drop policy if exists "Public access to logos" on storage.objects;


-- =============================================
-- Migration: 20260720130000_calendar_feed_tokens.sql
-- =============================================

create table public.calendar_feed_tokens (
    user_id uuid primary key references auth.users(id) on delete cascade,
    token_hash text not null unique,
    token_encrypted text not null,
    created_at timestamptz not null default now(),
    rotated_at timestamptz
);

alter table public.calendar_feed_tokens enable row level security;

create policy "Users can view their calendar feed token"
on public.calendar_feed_tokens for select
using (auth.uid() = user_id);

create policy "Users can create their calendar feed token"
on public.calendar_feed_tokens for insert
with check (auth.uid() = user_id);

create policy "Users can rotate their calendar feed token"
on public.calendar_feed_tokens for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- =============================================
-- Migration: 20260720132200_add_dispatch_notification_context.sql
-- =============================================

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


-- =============================================
-- Migration: 20260720134928_harden_dispatch_terminal_advancement.sql
-- =============================================

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


-- =============================================
-- Migration: 20260720135440_use_runtime_in_terminal_advancement.sql
-- =============================================

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


-- =============================================
-- Migration: 20260720140000_fix_dispatch_idempotency_and_notification_metadata.sql
-- =============================================

alter table public.in_app_notifications
  add column if not exists data jsonb not null default '{}'::jsonb;

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
  lead_time text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select r.id, r.user_id, p.channel,
    (run_time at time zone coalesce(us.timezone, 'UTC'))::date,
    r.name, r.notes, p.custom_time, coalesce(us.timezone, 'UTC'),
    r.category::text, rr.next_occurrence_at, p.lead_time::text
  from public.reminder_items r
  left join public.user_settings us on us.user_id = r.user_id
  join public.recurrence_rules rr on rr.reminder_item_id = r.id
  join public.notification_preferences p on p.reminder_item_id = r.id
  where p.enabled
    and rr.next_occurrence_at is not null
    and not exists (
      select 1 from public.snooze_state ss
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
      select 1 from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.status in ('sent', 'skipped')
    )
    and (
      select count(*) from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.status = 'failed'
    ) < 3;
end;
$$;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;


-- =============================================
-- Migration: 20260720150000_add_dispatch_details_context.sql
-- =============================================

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
    (run_time at time zone coalesce(us.timezone, 'UTC'))::date,
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
      select 1 from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.status in ('sent', 'skipped')
    )
    and (
      select count(*) from public.delivery_log dl
      where dl.reminder_item_id = r.id
        and dl.channel = p.channel
        and dl.occurrence_date = (run_time at time zone coalesce(us.timezone, 'UTC'))::date
        and dl.status = 'failed'
    ) < 3;
end;
$$;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;


-- =============================================
-- Migration: 20260721000000_fix_dispatch_occurrence_date_and_nudge_cron.sql
-- =============================================

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


-- =============================================
-- Migration: 20260721010000_fix_nudge_cron_vault.sql
-- =============================================

-- Fix invoke_dispatch_nudge_edge_function to use vault secrets like invoke_dispatch_edge_function
create or replace function public.invoke_dispatch_nudge_edge_function()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  base_url text;
  anon_key text;
  edge_function_url text;
  request_id bigint;
begin
  select coalesce(
    nullif(trim(current_setting('app.settings.edge_function_base_url', true)), ''),
    (
      select nullif(trim(decrypted_secret), '')
      from vault.decrypted_secrets
      where name = 'dispatch_edge_function_base_url'
      limit 1
    )
  ) into base_url;

  select coalesce(
    nullif(trim(current_setting('app.settings.anon_key', true)), ''),
    (
      select nullif(trim(decrypted_secret), '')
      from vault.decrypted_secrets
      where name = 'dispatch_anon_key'
      limit 1
    )
  ) into anon_key;

  if base_url is null or base_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/?$' then
    raise exception 'dispatch Edge Function base URL is not configured';
  end if;

  if anon_key is null then
    raise exception 'dispatch anon key is not configured';
  end if;

  edge_function_url := rtrim(base_url, '/') || '/dispatch-nudge';

  select net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb
  ) into request_id;
end;
$$;


-- =============================================
-- Automatic Vault Configuration
-- =============================================
DELETE FROM vault.secrets WHERE name IN ('dispatch_edge_function_base_url', 'dispatch_anon_key');
SELECT vault.create_secret('https://wysdrfnnsoaphrfxcotx.supabase.co/functions/v1', 'dispatch_edge_function_base_url');
SELECT vault.create_secret('sb_publishable_Ft0eEnWaaX-t9xLkqdFOxA_DRHkYrJ9', 'dispatch_anon_key');
