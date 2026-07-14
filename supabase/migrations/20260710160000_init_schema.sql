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
