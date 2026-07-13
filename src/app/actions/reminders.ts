'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { computeInitialNextOccurrence } from '@/lib/occurrence-scheduler'

const baseReminderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['person', 'subscription', 'task', 'custom_holiday']),
  icon_key: z.string().optional(),
  color_accent: z.string().optional(),
  notes: z.string().optional(),
})

// Extended schemas
const personDetailsSchema = z.object({
  birthdate: z.string().optional(), // YYYY-MM-DD
  relationship: z.enum(['family', 'partner', 'friend', 'colleague', 'other']).optional(),
  custom_relationship: z.string().optional(),
  gender: z.enum(['male', 'female', 'nonbinary', 'unspecified']).optional(),
  avatar_url: z.string().optional(),
})

const subscriptionDetailsSchema = z.object({
  logo_url: z.string().optional(),
  logo_domain: z.string().optional(),
  billing_amount: z.number().optional(),
  billing_currency: z.string().optional(),
  renewal_date: z.string().optional(),
  cycle: z.enum(['weekly', 'monthly', 'yearly', 'custom_days']).optional(),
})

const taskDetailsSchema = z.object({
  due_at: z.string().optional(), // ISO date string
})

const holidayDetailsSchema = z.object({
  country_code: z.string(),
  holiday_key: z.string(),
  holiday_date: z.string(),
  is_custom: z.boolean().optional(),
})

const recurrenceRuleSchema = z.object({
  frequency: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom_days']),
  interval_count: z.number().default(1),
  ends: z.enum(['never', 'after_occurrences', 'on_date']),
  ends_value: z.string().optional(),
})

const notificationPreferenceSchema = z.object({
  channel: z.enum(['email', 'push', 'telegram', 'in_app']),
  enabled: z.boolean(),
  lead_time: z.enum(['at_time', 'morning_of', 'noon_of', 'evening_of', 'custom']),
  custom_time: z.string().optional(), // HH:mm:ss
  offset_days: z.number().optional(),
})

export type ReminderPayload = z.infer<typeof baseReminderSchema> & {
  person_details?: z.infer<typeof personDetailsSchema>
  subscription_details?: z.infer<typeof subscriptionDetailsSchema>
  task_details?: z.infer<typeof taskDetailsSchema>
  holiday_details?: z.infer<typeof holidayDetailsSchema>
  recurrence_rules?: z.infer<typeof recurrenceRuleSchema>
  notification_preferences?: z.infer<typeof notificationPreferenceSchema>[]
}

export type EscalationState = {
  occurrence_date: string
  first_notified_at?: string
  marked_done_at?: string
  nudge_sent_at?: string
}

export type ReminderItemWithDetails = {
  id: string
  user_id: string
  category: 'person' | 'subscription' | 'task' | 'custom_holiday'
  name: string
  icon_key?: string
  color_accent?: string
  notes?: string
  created_at: string
  updated_at: string
  archived_at?: string
  person_details?: z.infer<typeof personDetailsSchema> | null
  subscription_details?: z.infer<typeof subscriptionDetailsSchema> | null
  task_details?: z.infer<typeof taskDetailsSchema> | null
  holiday_details?: z.infer<typeof holidayDetailsSchema> | null
  recurrence_rules?: z.infer<typeof recurrenceRuleSchema> | null
  notification_preferences?: z.infer<typeof notificationPreferenceSchema>[]
  escalation_state?: EscalationState[]
}

export async function getReminder(id: string): Promise<ReminderItemWithDetails | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('reminder_items')
    .select(`
      *,
      person_details (*),
      subscription_details (*),
      task_details (*),
      holiday_details (*),
      recurrence_rules (*),
      notification_preferences (*),
      escalation_state (*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return null

  const unwrapDetails = (item: any) => ({
    ...item,
    person_details: Array.isArray(item.person_details) ? item.person_details[0] : item.person_details,
    subscription_details: Array.isArray(item.subscription_details) ? item.subscription_details[0] : item.subscription_details,
    task_details: Array.isArray(item.task_details) ? item.task_details[0] : item.task_details,
    holiday_details: Array.isArray(item.holiday_details) ? item.holiday_details[0] : item.holiday_details,
    recurrence_rules: Array.isArray(item.recurrence_rules) ? item.recurrence_rules[0] : item.recurrence_rules,
  })

  return unwrapDetails(data) as ReminderItemWithDetails
}

export async function getReminders(): Promise<ReminderItemWithDetails[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('reminder_items')
    .select(`
      *,
      person_details (*),
      subscription_details (*),
      task_details (*),
      holiday_details (*),
      recurrence_rules (*),
      notification_preferences (*),
      escalation_state (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const unwrapDetails = (item: any) => ({
    ...item,
    person_details: Array.isArray(item.person_details) ? item.person_details[0] : item.person_details,
    subscription_details: Array.isArray(item.subscription_details) ? item.subscription_details[0] : item.subscription_details,
    task_details: Array.isArray(item.task_details) ? item.task_details[0] : item.task_details,
    holiday_details: Array.isArray(item.holiday_details) ? item.holiday_details[0] : item.holiday_details,
    recurrence_rules: Array.isArray(item.recurrence_rules) ? item.recurrence_rules[0] : item.recurrence_rules,
  })

  return data.map(unwrapDetails) as ReminderItemWithDetails[]
}

export async function createReminder(payload: ReminderPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Insert Base Item
  const { data: item, error: itemError } = await supabase
    .from('reminder_items')
    .insert({
      user_id: user.id,
      category: payload.category,
      name: payload.name,
      icon_key: payload.icon_key,
      color_accent: payload.color_accent,
      notes: payload.notes,
    })
    .select()
    .single()

  if (itemError) throw new Error(itemError.message)

  const itemId = item.id

  // 2. Insert Category Details
  if (payload.category === 'person' && payload.person_details) {
    const { error } = await supabase.from('person_details').insert({ reminder_item_id: itemId, ...payload.person_details })
    if (error) throw new Error('Person details error: ' + error.message)
  } else if (payload.category === 'subscription' && payload.subscription_details) {
    const { error } = await supabase.from('subscription_details').insert({ reminder_item_id: itemId, ...payload.subscription_details })
    if (error) throw new Error('Subscription details error: ' + error.message)
  } else if (payload.category === 'task' && payload.task_details) {
    const { error } = await supabase.from('task_details').insert({ reminder_item_id: itemId, ...payload.task_details })
    if (error) throw new Error('Task details error: ' + error.message)
  } else if (payload.category === 'custom_holiday' && payload.holiday_details) {
    const { error } = await supabase.from('holiday_details').insert({ reminder_item_id: itemId, ...payload.holiday_details })
    if (error) throw new Error('Holiday details error: ' + error.message)
  }

  // 3. Insert Recurrence
  if (payload.recurrence_rules) {
    const nextOccurrence = computeInitialNextOccurrence(payload)
    await supabase.from('recurrence_rules').insert({
      reminder_item_id: itemId,
      ...payload.recurrence_rules,
      next_occurrence_at: nextOccurrence,
    })
  }

  // 4. Insert Notifications
  if (payload.notification_preferences && payload.notification_preferences.length > 0) {
    const prefs = payload.notification_preferences.map(p => ({
      reminder_item_id: itemId,
      channel: p.channel,
      enabled: p.enabled,
      lead_time: p.lead_time,
      custom_time: p.custom_time,
      offset_days: p.offset_days ?? 0,
    }))
    await supabase.from('notification_preferences').insert(prefs)
  }

  revalidatePath('/', 'layout')
  return item
}

export async function updateReminder(id: string, payload: Partial<ReminderPayload>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('reminder_items')
    .select('category')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw new Error('Reminder not found')

  const { error: itemError } = await supabase
    .from('reminder_items')
    .update({
      name: payload.name,
      notes: payload.notes,
      icon_key: payload.icon_key,
      color_accent: payload.color_accent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (itemError) throw new Error(itemError.message)

  if (payload.person_details) {
    await supabase.from('person_details').upsert({ reminder_item_id: id, ...payload.person_details })
  }
  if (payload.subscription_details) {
    await supabase.from('subscription_details').upsert({ reminder_item_id: id, ...payload.subscription_details })
  }
  if (payload.task_details) {
    await supabase.from('task_details').upsert({ reminder_item_id: id, ...payload.task_details })
  }
  if (payload.recurrence_rules) {
    const fullPayload = { ...payload, category: existing.category } as ReminderPayload
    const nextOccurrence = computeInitialNextOccurrence(fullPayload)
    await supabase.from('recurrence_rules').upsert({
      reminder_item_id: id,
      ...payload.recurrence_rules,
      next_occurrence_at: nextOccurrence,
    })
  }
  if (payload.notification_preferences) {
    await supabase.from('notification_preferences').delete().eq('reminder_item_id', id)
    const prefs = payload.notification_preferences.map(p => ({
      reminder_item_id: id,
      channel: p.channel,
      enabled: p.enabled,
      lead_time: p.lead_time,
      custom_time: p.custom_time,
      offset_days: p.offset_days ?? 0,
    }))
    if (prefs.length > 0) await supabase.from('notification_preferences').insert(prefs)
  }

  revalidatePath('/', 'layout')
}

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  
  // RLS will ensure user only deletes their own
  const { error } = await supabase.from('reminder_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function snoozeReminder(reminderItemId: string, occurrenceDate: string, hours = 1) {
  const supabase = await createClient()
  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('snooze_state').upsert({
    reminder_item_id: reminderItemId,
    occurrence_date: occurrenceDate,
    snoozed_until: snoozedUntil,
  }, { onConflict: 'reminder_item_id, occurrence_date' })

  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function markTaskDone(reminderItemId: string, occurrenceDate: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('escalation_state')
    .upsert({
      reminder_item_id: reminderItemId,
      occurrence_date: occurrenceDate,
      marked_done_at: new Date().toISOString(),
    }, { onConflict: 'reminder_item_id, occurrence_date' })

  if (error) throw new Error(error.message)
    
  revalidatePath('/', 'layout')
}
