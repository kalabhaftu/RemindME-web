import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export const dynamic = 'force-dynamic'

function escapeIcs(value: string) {
  return value.replace(/[\\;,\n]/g, match => match === '\n' ? '\\n' : `\\${match}`)
}

function dateValue(value: string) {
  return value.slice(0, 10).replaceAll('-', '')
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: tokenRow } = await admin.from('calendar_feed_tokens').select('user_id').eq('token_hash', tokenHash).maybeSingle()
  if (!tokenRow) return new NextResponse('Not found', { status: 404 })

  const { data: reminders, error } = await admin.from('reminder_items').select('id,name,category,notes,person_details(birthdate),subscription_details(renewal_date),task_details(due_at),holiday_details(holiday_date)').eq('user_id', tokenRow.user_id).is('archived_at', null)
  if (error) return new NextResponse('Calendar unavailable', { status: 500 })

  const now = new Date()
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RemindME//Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:RemindME']
  for (const item of reminders ?? []) {
    const person = Array.isArray(item.person_details) ? item.person_details[0] : item.person_details
    const subscription = Array.isArray(item.subscription_details) ? item.subscription_details[0] : item.subscription_details
    const task = Array.isArray(item.task_details) ? item.task_details[0] : item.task_details
    const holiday = Array.isArray(item.holiday_details) ? item.holiday_details[0] : item.holiday_details
    const rawDate = item.category === 'person' ? person?.birthdate : item.category === 'subscription' ? subscription?.renewal_date : item.category === 'task' ? task?.due_at : holiday?.holiday_date
    if (!rawDate) continue
    const isDateOnly = item.category !== 'task' || String(rawDate).length <= 10
    lines.push('BEGIN:VEVENT', `UID:${item.id}@remindme`, `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`, `SUMMARY:${escapeIcs(item.name)}`)
    if (isDateOnly) {
      lines.push(`DTSTART;VALUE=DATE:${dateValue(String(rawDate))}`)
      if (item.category === 'person' || item.category === 'custom_holiday') lines.push('RRULE:FREQ=YEARLY')
    } else {
      lines.push(`DTSTART:${new Date(String(rawDate)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`)
    }
    if (item.notes) lines.push(`DESCRIPTION:${escapeIcs(item.notes)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return new NextResponse(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="remindme-calendar.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
