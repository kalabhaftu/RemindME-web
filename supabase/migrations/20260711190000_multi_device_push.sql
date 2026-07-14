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
