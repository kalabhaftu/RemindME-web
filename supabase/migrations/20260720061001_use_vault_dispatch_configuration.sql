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
