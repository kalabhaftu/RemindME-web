alter table public.user_settings
  add column if not exists default_channels jsonb not null default '{"email": true, "push": false, "telegram": false, "in_app": true}'::jsonb,
  add column if not exists default_lead_time text not null default 'morning_of',
  add column if not exists default_custom_time text not null default '09:00';
