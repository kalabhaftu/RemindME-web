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
