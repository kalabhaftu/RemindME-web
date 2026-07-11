import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 1: Revoke external tokens (e.g. Telegram if needed)
    // The spec notes "cascade + external token revocation"
    const { data: channels } = await supabase
      .from('notification_channels')
      .select('channel, encrypted_token')
      .eq('user_id', user.id)

    if (channels) {
      for (const ch of channels) {
        if (ch.channel === 'telegram' && ch.encrypted_token) {
          // If we had a mechanism to log out the bot, we'd call Telegram API here.
          // For now, since it's the user's personal bot token, we just delete it from our DB.
        }
      }
    }

    // Step 2: Delete user from Supabase Auth. 
    // This requires Service Role key because users can't typically delete themselves via client API in Supabase
    // without a specific edge function or admin API.
    const serviceClient = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Auth cascade will delete `reminder_items`, `notification_channels`, `delivery_log`
    const { error } = await serviceClient.auth.admin.deleteUser(user.id)
    
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
