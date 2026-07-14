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
