import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

function buildNotification(item: any): { title: string; body: string; html: string; tgText: string } {
  const date = formatFriendlyDate(item.occurrence_date)
  const time = item.custom_time ? item.custom_time.slice(0, 5) : null
  const dateTime = date + (time ? ` at ${time}` : '')
  const notes = item.notes ? `\n\n${item.notes}` : ''

  const title = `📅 ${item.name}`
  const body = `Due ${dateTime}${notes}`

  const html = `<div style="font-family: -apple-system, sans-serif; padding: 20px;">
    <h2 style="color: #333; margin: 0 0 8px;">📅 ${item.name}</h2>
    <p style="color: #666; margin: 0 0 4px;"><strong>Due:</strong> ${dateTime}</p>
    ${item.notes ? `<p style="color: #555; margin: 8px 0 0;"><strong>Notes:</strong><br>${item.notes.replace(/\n/g, '<br>')}</p>` : ''}
    <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">
    <p style="color: #999; font-size: 12px;">Sent by RemindME</p>
  </div>`

  const tgText = `📅 *${item.name}*\n_Due: ${dateTime}_${item.notes ? `\n\n${item.notes}` : ''}`

  return { title, body, html, tgText }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    // 1. Fetch due reminders — pass current UTC timestamp as required by the SQL function signature
    const runTime = new Date().toISOString()
    const { data: dueItems, error: dueError } = await supabase.rpc('reminder_occurrences_due', { run_time: runTime })

    if (dueError) {
      console.error('Error fetching due reminders:', dueError)
      return new Response(JSON.stringify({ error: dueError.message }), { status: 500 })
    }

    console.log(`Found ${dueItems?.length || 0} due reminders`)

    if (!dueItems || dueItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No due reminders' }), { status: 200 })
    }

    const results = []

    // 2. Process each due reminder
    for (const item of dueItems) {
      let status = 'failed'
      let errorMessage = null
      const msg = buildNotification(item)

      try {
        if (item.channel === 'in_app') {
          const { error: inAppError } = await supabase.from('in_app_notifications').insert({
            user_id: item.user_id,
            reminder_item_id: item.reminder_item_id,
            title: msg.title,
            body: msg.body
          })
          if (inAppError) throw new Error(`In-app insertion failed: ${inAppError.message}`)
          status = 'sent'
        } else if (item.channel === 'email') {
          if (!resendApiKey) throw new Error('Resend API key missing')
          const { data: userData } = await supabase.auth.admin.getUserById(item.user_id)
          const userEmail = userData?.user?.email
          if (userEmail) {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'RemindME <onboarding@resend.dev>',
                to: userEmail,
                subject: msg.title,
                html: msg.html
              }),
            })
            if (res.ok) {
              status = 'sent'
            } else {
              const errData = await res.json()
              throw new Error(errData.message || 'Email sending failed')
            }
          } else {
             throw new Error('User email not found')
          }
        } else if (item.channel === 'telegram') {
          const { data: channelData, error: dbError } = await supabase
            .from('notification_channels')
            .select('encrypted_token, chat_id_encrypted')
            .eq('user_id', item.user_id)
            .eq('channel', 'telegram')
            .single();

          if (dbError || !channelData?.encrypted_token) {
            throw new Error('Telegram bot token not found for user');
          }

          const encryptionKey = Deno.env.get('ENCRYPTION_KEY') ?? '';
          let token = channelData.encrypted_token;
          try {
            const { decrypt } = await import('./encryption.ts');
            token = decrypt(token, encryptionKey);
          } catch (e) {
            console.warn('Fallback to legacy raw token decryption failed:', e.message);
          }

          let chatId: string;
          if (channelData.chat_id_encrypted) {
            try {
              const { decrypt } = await import('./encryption.ts');
              chatId = decrypt(channelData.chat_id_encrypted, encryptionKey);
            } catch {
              const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
              if (!updatesRes.ok) throw new Error('Failed to fetch updates from Telegram');
              const updatesData = await updatesRes.json();
              const messages = updatesData.result || [];
              const lastMessage = [...messages].reverse().find((m: { message?: { chat?: { id?: number } } }) => m.message?.chat?.id);
              if (!lastMessage?.message?.chat?.id) throw new Error('No chat history found. Send a message to your bot first.');
              chatId = String(lastMessage.message.chat.id);
            }
          } else {
            const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
            if (!updatesRes.ok) throw new Error('Failed to fetch updates from Telegram');
            const updatesData = await updatesRes.json();
            const messages = updatesData.result || [];
            const lastMessage = [...messages].reverse().find((m: { message?: { chat?: { id?: number } } }) => m.message?.chat?.id);
            if (!lastMessage?.message?.chat?.id) throw new Error('No chat history found. Send a message to your bot first.');
            chatId = String(lastMessage.message.chat.id);
          }

          const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg.tgText,
              parse_mode: 'Markdown',
            })
          });

          if (!sendRes.ok) {
            const errorText = await sendRes.text();
            throw new Error(`Telegram send failed: ${errorText}`);
          }

          status = 'sent';
        } else if (item.channel === 'push') {
          const { data: channelData, error: dbError } = await supabase
            .from('notification_channels')
            .select('encrypted_token')
            .eq('user_id', item.user_id)
            .eq('channel', 'push');

          if (dbError || !channelData || channelData.length === 0) {
            throw new Error('FCM push tokens not found for user');
          }

          const serviceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
          if (!serviceAccount) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured on the backend');
          }

          const { sendFcmNotification } = await import('./fcm.ts');
          const fcmResults = await Promise.allSettled(
            channelData.map((cd) =>
              sendFcmNotification(
                serviceAccount,
                cd.encrypted_token,
                msg.title,
                msg.body,
                {
                  category: item.category,
                  reminder_item_id: item.reminder_item_id,
                }
              )
            )
          );

          const failed = fcmResults.filter((r) => r.status === 'rejected');
          if (failed.length > 0) {
            failed.forEach((r: any) => console.error('FCM delivery failure:', r.reason));
            if (failed.length === fcmResults.length) {
              throw new Error(`All push deliveries failed (${failed.length} devices)`);
            }
          }

          status = 'sent';
        } else {
          status = 'skipped'
          errorMessage = 'Channel dispatch not yet implemented'
        }
      } catch (err) {
        console.error(`Failed to dispatch for item ${item.reminder_item_id}:`, err)
        status = 'failed'
        errorMessage = err.message
      }

      // 3. Log outcome in delivery_log
      await supabase.from('delivery_log').insert({
        reminder_item_id: item.reminder_item_id,
        user_id: item.user_id,
        channel: item.channel,
        occurrence_date: item.occurrence_date,
        status: status,
        scheduled_for: new Date().toISOString(),
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        error_message: errorMessage,
      })

      // 3.5 Upsert escalation_state for primary notification
      if (status === 'sent') {
        const { error: escalationError } = await supabase.from('escalation_state').upsert({
          reminder_item_id: item.reminder_item_id,
          occurrence_date: item.occurrence_date,
          first_notified_at: new Date().toISOString()
        }, { onConflict: 'reminder_item_id, occurrence_date' })

        if (escalationError) {
          console.error(`Failed to update escalation state for ${item.reminder_item_id}:`, escalationError)
        }
      }
      
      // 4. Advance reminder occurrence
      const { error: advanceError } = await supabase.rpc('advance_reminder_occurrence', {
        p_reminder_item_id: item.reminder_item_id
      })
      if (advanceError) {
         console.error(`Failed to advance reminder ${item.reminder_item_id}:`, advanceError)
      }

      results.push({ item_id: item.reminder_item_id, status, error: errorMessage })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Dispatch error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
