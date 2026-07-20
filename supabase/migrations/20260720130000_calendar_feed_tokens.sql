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
