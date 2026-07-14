-- Set 30-day session expiration in Supabase Auth
-- Run this in Supabase SQL Editor:
-- UPDATE auth.config SET session_expiry = 2592000 WHERE id = (SELECT id FROM auth.config LIMIT 1);
--
-- Or set via Dashboard: Authentication > Settings > Session duration > 30 days

-- Attempt to set via built-in config function
select set_config('auth.session_expiry', '2592000', false);
