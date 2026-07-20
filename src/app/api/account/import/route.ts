import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth-helper'

const importSchema = z.object({
  format: z.literal('remindme-export').optional(),
  version: z.number().int().min(1).max(1).optional(),
  reminders: z.array(z.record(z.string(), z.unknown())).max(5000),
})

function first(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = await request.json()
    const parsed = importSchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid RemindME JSON export' }, { status: 400 })

    const { data: existing, error: existingError } = await supabase
      .from('reminder_items')
      .select('id, name, category')
      .eq('user_id', user.id)
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const existingKeys = new Set((existing ?? []).map(item => `${item.category}:${item.name.trim().toLowerCase()}`))
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const source of parsed.data.reminders) {
      const name = text(source.name)
      const category = source.category
      if (!name || !['person', 'subscription', 'task', 'custom_holiday'].includes(String(category))) {
        errors.push('Skipped reminder with missing name or invalid category')
        continue
      }
      const key = `${category}:${name.toLowerCase()}`
      if (existingKeys.has(key)) {
        skipped++
        continue
      }

      const { data: item, error: itemError } = await supabase
        .from('reminder_items')
        .insert({
          user_id: user.id,
          category,
          name,
          icon_key: text(source.icon_key),
          color_accent: text(source.color_accent),
          notes: text(source.notes),
        })
        .select('id')
        .single()
      if (itemError || !item) {
        errors.push(`Failed to import ${name}`)
        continue
      }

      const detailTable = category === 'person' ? 'person_details'
        : category === 'subscription' ? 'subscription_details'
        : category === 'task' ? 'task_details' : 'holiday_details'
      const detailKey = category === 'person' ? 'person_details'
        : category === 'subscription' ? 'subscription_details'
        : category === 'task' ? 'task_details' : 'holiday_details'
      const detail = first(source[detailKey])
      if (detail) {
        const { reminder_item_id: _ignored, id: _detailId, ...safeDetail } = detail
        const { error } = await supabase.from(detailTable).insert({ reminder_item_id: item.id, ...safeDetail })
        if (error) errors.push(`Imported ${name}, but its details could not be restored`)
      }

      const recurrence = first(source.recurrence_rules)
      if (recurrence) {
        const { reminder_item_id: _ignored, id: _ruleId, ...safeRecurrence } = recurrence
        await supabase.from('recurrence_rules').insert({ reminder_item_id: item.id, ...safeRecurrence })
      }

      const prefs = Array.isArray(source.notification_preferences) ? source.notification_preferences : []
      if (prefs.length) {
        const safePrefs = prefs.map(pref => {
          const row = pref as Record<string, unknown>
          return {
            reminder_item_id: item.id,
            channel: row.channel,
            enabled: row.enabled !== false,
            lead_time: row.lead_time ?? 'at_time',
            ...(text(row.custom_time) ? { custom_time: text(row.custom_time) } : {}),
            offset_days: typeof row.offset_days === 'number' ? row.offset_days : 0,
          }
        })
        await supabase.from('notification_preferences').insert(safePrefs)
      }

      existingKeys.add(key)
      imported++
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed' }, { status: 500 })
  }
}
