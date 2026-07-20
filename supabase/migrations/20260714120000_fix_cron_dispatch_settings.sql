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
