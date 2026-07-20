import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function resolveChatId(token: string, chatIdEncrypted: string | null, encryptionKey: string): Promise<string> {
  if (chatIdEncrypted) {
    try {
      const { decrypt } = await import('../dispatch-reminder/encryption.ts')
      return decrypt(chatIdEncrypted, encryptionKey)
    } catch { /* fall through */ }
  }

  const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`)
  if (!updatesRes.ok) throw new Error('Failed to fetch updates from Telegram')
  const updatesData = await updatesRes.json()
  const messages = updatesData.result || []
  const lastMessage = [...messages].reverse().find((m: { message?: { chat?: { id?: number } } }) => m.message?.chat?.id)
  if (!lastMessage?.message?.chat?.id) {
    throw new Error('No chat history found. Send a message to your bot first.')
  }
  return String(lastMessage.message.chat.id)
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { data: nudgeItems, error: nudgeError } = await supabase.rpc('reminders_needing_nudge')
    if (nudgeError) {
      return new Response(JSON.stringify({ error: nudgeError.message }), { status: 500 })
    }

    if (!nudgeItems || nudgeItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No due nudges' }), { status: 200 })
    }

    const serviceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if (!serviceAccount) {
      return new Response(JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT not configured' }), { status: 500 })
    }

    const results = []

    for (const item of nudgeItems) {
      let status = 'failed'
      let errorMessage: string | null = null

      try {
        const messageBody = `⏰ Follow-up: "${item.name}" hasn't been marked done yet. Did you finish it?`

        const { data: channelData, error: dbError } = await supabase
          .from('notification_channels')
          .select('id, encrypted_token')
          .eq('user_id', item.user_id)
          .eq('channel', 'push')

        if (dbError || !channelData || channelData.length === 0) {
          throw new Error('FCM push tokens not found for user')
        }

        const { sendFcmNotification } = await import('../dispatch-reminder/fcm.ts')
        const pushResults = await Promise.allSettled(
          channelData.map((cd: { id: string; encrypted_token: string }) =>
            sendFcmNotification(serviceAccount, cd.encrypted_token, `Follow-up: ${item.name}`, messageBody)
          )
        )

        const failed = pushResults.filter((r) => r.status === 'rejected')
        await Promise.all(
          pushResults.map((result, index) => {
            if (result.status !== 'rejected' || !result.reason?.unregistered) return Promise.resolve()
            return supabase.from('notification_channels').delete().eq('id', channelData[index].id)
          })
        )

        if (failed.length === pushResults.length) {
          throw new Error(`All push nudge deliveries failed (${failed.length} devices)`)
        }

        status = 'sent'
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : 'Unknown error'
      }

      await supabase
        .from('escalation_state')
        .update({ nudge_sent_at: new Date().toISOString() })
        .match({ reminder_item_id: item.reminder_item_id, occurrence_date: item.occurrence_date })

      results.push({ item_id: item.reminder_item_id, status, error: errorMessage })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
