import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth-helper'
import { computeInitialNextOccurrence } from '@/lib/occurrence-scheduler'
import { revalidatePath } from 'next/cache'

const requestSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })).max(5000),
})

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid contact import' }, { status: 400 })

    const [{ data: existing, error: existingError }, { data: settings }] = await Promise.all([
      supabase.from('reminder_items').select('name, category').eq('user_id', user.id),
      supabase.from('user_settings').select('default_channels, default_lead_time, default_custom_time').eq('user_id', user.id).maybeSingle(),
    ])
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const existingKeys = new Set((existing ?? [])
      .filter(item => item.category === 'person')
      .map(item => item.name.trim().toLowerCase()))
    const channels = (settings?.default_channels ?? {}) as Record<string, boolean>
    const notificationPreferences = Object.entries(channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => ({
        channel,
        enabled: true,
        lead_time: settings?.default_lead_time ?? 'at_time',
        custom_time: settings?.default_custom_time ?? null,
        offset_days: 0,
      }))

    let imported = 0
    let skipped = 0
    let withBirthday = 0
    let withoutBirthday = 0
    const errors: string[] = []

    for (const contact of parsed.data.contacts) {
      const name = contact.name.trim()
      const key = name.toLowerCase()
      if (!existingKeys.add(key)) {
        skipped++
        continue
      }

      const { data: item, error: itemError } = await supabase
        .from('reminder_items')
        .insert({ user_id: user.id, category: 'person', name })
        .select('id')
        .single()
      if (itemError || !item) {
        errors.push(`Failed to import ${name}`)
        continue
      }

      const { error: detailError } = await supabase.from('person_details').insert({
        reminder_item_id: item.id,
        birthdate: contact.birthdate ?? null,
        relationship: 'friend',
        gender: 'unspecified',
      })
      if (detailError) {
        await supabase.from('reminder_items').delete().eq('id', item.id).eq('user_id', user.id)
        errors.push(`Failed to import ${name}`)
        continue
      }

      if (contact.birthdate) {
        const { error: recurrenceError } = await supabase.from('recurrence_rules').insert({
          reminder_item_id: item.id,
          frequency: 'yearly',
          interval_count: 1,
          ends: 'never',
          next_occurrence_at: computeInitialNextOccurrence({
            category: 'person',
            name,
            person_details: { birthdate: contact.birthdate },
          }),
        })
        if (recurrenceError) errors.push(`Imported ${name}, but birthday scheduling failed`)
        if (notificationPreferences.length) {
          const { error: prefsError } = await supabase.from('notification_preferences').insert(
            notificationPreferences.map(pref => ({ reminder_item_id: item.id, ...pref }))
          )
          if (prefsError) errors.push(`Imported ${name}, but notification defaults could not be applied`)
        }
        withBirthday++
      } else {
        withoutBirthday++
      }
      imported++
    }

    revalidatePath('/', 'layout')
    return NextResponse.json({ imported, skipped, withBirthday, withoutBirthday, errors })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Contact import failed' }, { status: 500 })
  }
}
