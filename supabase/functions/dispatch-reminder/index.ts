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

function formatFriendlyDateTime(eventAt: string, timezone: string): string {
  if (!eventAt) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: timezone || 'UTC', hour12: false
  }).formatToParts(new Date(eventAt))
  const date = parts.filter(part => ['weekday', 'month', 'day'].includes(part.type)).map(part => part.value).join(' ').replace(' ', ', ')
  const hour = parts.find(part => part.type === 'hour')?.value ?? '00'
  const minute = parts.find(part => part.type === 'minute')?.value ?? '00'
  return `${date} at ${hour === '24' ? '00' : hour}:${minute}`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char] ?? char))
}

function formatMoney(amount: unknown, currency: unknown): string | null {
  if (amount === null || amount === undefined || amount === '') return null
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return null
  return `${String(currency || 'USD')} ${numeric.toFixed(numeric % 1 === 0 ? 0 : 2)}`
}

function formatPlainDate(value: unknown, timezone: string): string | null {
  if (!value) return null
  const raw = String(value)
  const date = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone || 'UTC',
  }).format(date)
}

function buildDetailLines(item: any): Array<{ label: string; value: string }> {
  const details = item.details ?? {}
  const timezone = item.timezone || 'UTC'
  const category = String(item.category ?? '').toLowerCase()
  const lines: Array<{ label: string; value: string }> = []

  if (category === 'subscription') {
    const price = formatMoney(details.billing_amount, details.billing_currency)
    if (price) lines.push({ label: 'Amount', value: price })
    if (details.cycle) lines.push({ label: 'Billing cycle', value: String(details.cycle) })
    const renewal = formatPlainDate(details.renewal_date, timezone)
    if (renewal) lines.push({ label: 'Renewal date', value: renewal })
  } else if (category === 'person') {
    const birthday = formatPlainDate(details.birthdate, timezone)
    if (birthday) lines.push({ label: 'Birthday', value: birthday })
    if (details.relationship) lines.push({ label: 'Relationship', value: String(details.relationship) })
  } else if (category === 'task') {
    if (details.due_at) lines.push({ label: 'Task time', value: formatFriendlyDateTime(String(details.due_at), timezone) })
  } else if (category === 'custom_holiday') {
    const holidayDate = formatPlainDate(details.holiday_date, timezone)
    if (holidayDate) lines.push({ label: 'Holiday date', value: holidayDate })
    if (details.country_code) lines.push({ label: 'Country', value: String(details.country_code) })
  }

  return lines
}

function buildNotification(item: any): { title: string; body: string; html: string; tgText: string } {
  const dateTime = formatFriendlyDateTime(item.event_at, item.timezone)
  const category = String(item.category ?? '').toLowerCase()
  const labels: Record<string, { icon: string; noun: string; verb: string }> = {
    person: { icon: '🎂', noun: 'Birthday', verb: 'is coming up' },
    subscription: { icon: '💳', noun: 'Subscription', verb: 'renews' },
    task: { icon: '✓', noun: 'Task', verb: 'is due' },
    custom_holiday: { icon: '🎉', noun: 'Holiday', verb: 'is coming up' },
  }
  const template = labels[category] ?? { icon: '📅', noun: 'Reminder', verb: 'is due' }
  const name = String(item.name ?? 'Reminder')
  const detailLines = buildDetailLines(item)
  const notes = item.notes ? `\n\nNotes:\n${item.notes}` : ''
  const plainDetails = detailLines.length
    ? `\n\nDetails:\n${detailLines.map(line => `${line.label}: ${line.value}`).join('\n')}`
    : ''
  const safeName = escapeHtml(String(item.name ?? 'Reminder'))
  const safeNotes = item.notes ? escapeHtml(String(item.notes)) : ''
  const htmlDetails = detailLines.length
    ? `<div style="color: #555; margin: 12px 0 0;">${detailLines.map(line => `<p style="margin: 4px 0;"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</p>`).join('')}</div>`
    : ''

  const title = `${template.icon} ${template.noun}: ${name}`
  const body = `${name} ${template.verb} ${dateTime ? `on ${dateTime}` : ''}${plainDetails}${notes}`

  const html = `<div style="font-family: -apple-system, sans-serif; padding: 20px;">
    <h2 style="color: #333; margin: 0 0 8px;">${template.icon} ${template.noun}: ${safeName}</h2>
    <p style="color: #666; margin: 0 0 4px;"><strong>Due:</strong> ${dateTime}</p>
    ${htmlDetails}
    ${item.notes ? `<p style="color: #555; margin: 8px 0 0;"><strong>Notes:</strong><br>${safeNotes.replace(/\n/g, '<br>')}</p>` : ''}
    <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">
    <p style="color: #999; font-size: 12px;">Sent by RemindME</p>
  </div>`

  const tgDetails = detailLines.length
    ? '\n' + detailLines.map(line => `<b>${escapeHtml(line.label)}:</b> ${escapeHtml(line.value)}`).join('\n')
    : ''

  const tgText = `<b>${template.icon} ${template.noun}: ${safeName}</b>
<b>Due:</b> ${dateTime}${tgDetails}${item.notes ? `\n\n<b>Notes:</b>\n${safeNotes}` : ''}`

  return { title, body, html, tgText }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    // 1. Fetch due reminders — pass current UTC timestamp as required by the SQL function signature
    const runTime = new Date().toISOString()
    const { data: advancedStale, error: advanceStaleError } = await supabase.rpc('advance_terminal_reminder_occurrences', { run_time: runTime })
    if (advanceStaleError) {
      console.error('Failed to advance terminal reminders before dispatch:', advanceStaleError)
    } else if (advancedStale) {
      console.log(`Advanced ${advancedStale} terminal reminder occurrences before dispatch`)
    }

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
    const occurrenceResults = new Map<string, { reminderItemId: string; occurrenceDate: string }>()

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
            body: msg.body,
            data: {
              reminder_item_id: item.reminder_item_id,
              category: item.category
            }
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
          try {
            const { decrypt } = await import('./encryption.ts');
            channelData.encrypted_token = decrypt(channelData.encrypted_token, encryptionKey);
            if (!/^\d+:[A-Za-z0-9_-]+$/.test(channelData.encrypted_token)) throw new Error('invalid token format')
          } catch (decErr) {
            throw new Error(`Telegram token decryption failed: ${decErr.message}. Key length: ${encryptionKey.length}. Key starts with: ${encryptionKey.slice(0, 4)}`);
          }

          let chatId: string;
          if (!channelData.chat_id_encrypted) {
            throw new Error('Telegram chat ID is not connected. Open Settings, send /start to your bot, then Detect or save the chat ID.');
          }
          try {
            const { decrypt } = await import('./encryption.ts');
            chatId = decrypt(channelData.chat_id_encrypted, encryptionKey);
          } catch (decErr) {
            throw new Error(`Telegram chat_id decryption failed: ${decErr.message}. Key length: ${encryptionKey.length}. Key starts with: ${encryptionKey.slice(0, 4)}`);
          }
          if (!/^-?\d+$/.test(chatId.trim())) throw new Error('Telegram chat ID is invalid. Reconnect Telegram in Settings.')

          const sendRes = await fetch(`https://api.telegram.org/bot${channelData.encrypted_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg.tgText,
              parse_mode: 'HTML',
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
            .select('id, encrypted_token')
            .eq('user_id', item.user_id)
            .eq('channel', 'push');

          if (dbError || !channelData || channelData.length === 0) {
            status = 'skipped';
            errorMessage = 'No registered push device for user';
          } else {
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
                    category: String(item.category ?? 'reminder'),
                    reminder_item_id: item.reminder_item_id,
                    path: item.category === 'person'
                      ? `/people/${item.reminder_item_id}`
                      : item.category === 'task'
                        ? `/tasks/${item.reminder_item_id}`
                        : item.category === 'subscription'
                          ? `/subscriptions/${item.reminder_item_id}`
                          : '/notifications',
                  }
                )
              )
            );

            const failed = fcmResults.filter((r) => r.status === 'rejected');
            if (failed.length > 0) {
              failed.forEach((r: any) => console.error('FCM delivery failure:', r.reason));
              await Promise.all(
                fcmResults.map((result, index) => {
                  if (result.status !== 'rejected' || !result.reason?.unregistered) return Promise.resolve();
                  return supabase.from('notification_channels').delete().eq('id', channelData[index].id);
                })
              );
              if (failed.length === fcmResults.length) {
                const allExpired = fcmResults.every((result) => result.status === 'rejected' && result.reason?.unregistered);
                if (allExpired) {
                  status = 'skipped';
                  errorMessage = 'Expired push devices removed';
                } else {
                  throw new Error(`All push deliveries failed (${failed.length} devices)`);
                }
              }
            }

            if (status !== 'skipped') status = 'sent';
          }
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

      const occurrenceKey = `${item.reminder_item_id}:${item.occurrence_date}`
      occurrenceResults.set(occurrenceKey, {
        reminderItemId: item.reminder_item_id,
        occurrenceDate: item.occurrence_date,
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
      
      results.push({ item_id: item.reminder_item_id, status, error: errorMessage })
    }

    for (const occurrence of occurrenceResults.values()) {
      const { data: isTerminal, error: terminalError } = await supabase.rpc('reminder_occurrence_all_channels_terminal', {
        p_reminder_item_id: occurrence.reminderItemId,
        p_occurrence_date: occurrence.occurrenceDate,
      })
      if (terminalError) {
        console.error(`Failed to check terminal state for ${occurrence.reminderItemId}:`, terminalError)
        continue
      }
      if (!isTerminal) continue

      const { error: advanceError } = await supabase.rpc('advance_reminder_occurrence', {
        p_reminder_item_id: occurrence.reminderItemId
      })
      if (advanceError) console.error(`Failed to advance reminder ${occurrence.reminderItemId}:`, advanceError)
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
