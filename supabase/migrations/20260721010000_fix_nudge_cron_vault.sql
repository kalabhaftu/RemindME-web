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
