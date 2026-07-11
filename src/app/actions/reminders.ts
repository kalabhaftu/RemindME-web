'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
  gender: z.enum(['male', 'female', 'nonbinary', 'unspecified']).optional(),
})

const subscriptionDetailsSchema = z.object({
  logo_url: z.string().optional(),
  billing_amount: z.number().optional(),
  billing_currency: z.string().optional(),
  renewal_date: z.string().optional(),
  cycle: z.enum(['weekly', 'monthly', 'yearly', 'custom_days']).optional(),
})

const taskDetailsSchema = z.object({
  due_at: z.string().optional(), // ISO date string
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
})

export type ReminderPayload = z.infer<typeof baseReminderSchema> & {
  person_details?: z.infer<typeof personDetailsSchema>
  subscription_details?: z.infer<typeof subscriptionDetailsSchema>
  task_details?: z.infer<typeof taskDetailsSchema>
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
  person_details?: z.infer<typeof personDetailsSchema>[]
  subscription_details?: z.infer<typeof subscriptionDetailsSchema>[]
  task_details?: z.infer<typeof taskDetailsSchema>[]
  recurrence_rules?: z.infer<typeof recurrenceRuleSchema>[]
  notification_preferences?: z.infer<typeof notificationPreferenceSchema>[]
  escalation_state?: EscalationState[]
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
      recurrence_rules (*),
      notification_preferences (*),
      escalation_state (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
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
    await supabase.from('person_details').insert({ reminder_item_id: itemId, ...payload.person_details })
  } else if (payload.category === 'subscription' && payload.subscription_details) {
    await supabase.from('subscription_details').insert({ reminder_item_id: itemId, ...payload.subscription_details })
  } else if (payload.category === 'task' && payload.task_details) {
    await supabase.from('task_details').insert({ reminder_item_id: itemId, ...payload.task_details })
  }

  // 3. Insert Recurrence
  if (payload.recurrence_rules) {
    await supabase.from('recurrence_rules').insert({ reminder_item_id: itemId, ...payload.recurrence_rules })
  }

  // 4. Insert Notifications
  if (payload.notification_preferences && payload.notification_preferences.length > 0) {
    const prefs = payload.notification_preferences.map(p => ({
      reminder_item_id: itemId,
      ...p
    }))
    await supabase.from('notification_preferences').insert(prefs)
  }

  revalidatePath('/')
  return item
}

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  
  // RLS will ensure user only deletes their own
  const { error } = await supabase.from('reminder_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
    
  revalidatePath('/')
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
    
  revalidatePath('/')
}
