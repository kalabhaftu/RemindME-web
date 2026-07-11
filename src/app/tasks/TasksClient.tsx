'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { AppShell, AddButton } from '@/components/AppShell'
import { TasksTable } from '@/components/tasks/TasksTable'
import { ReminderItemWithDetails } from '@/app/actions/reminders'

export function TasksClient({ initialItems }: { initialItems: ReminderItemWithDetails[] }) {
  const [items, setItems] = useState(initialItems)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => { setItems(initialItems) }, [initialItems])
  useEffect(() => {
    const ch = supabase.channel('tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'reminder_items' }, () => router.refresh()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, router])

  const markDone = async (id: string, occurrenceDate: string) => {
    await supabase.from('escalation_state').upsert({
      reminder_item_id: id,
      occurrence_date: occurrenceDate,
      marked_done_at: new Date().toISOString(),
    }, { onConflict: 'reminder_item_id, occurrence_date' })
    router.refresh()
  }

  return (
    <AppShell title="Tasks" action={<AddButton href="/tasks/new" label="Add Task" />}>
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold tracking-tight">Task Reminders</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] mt-1">Chores, habits, and one-off to-dos with icons and repeat schedules.</p>
      </div>
      <TasksTable items={items} onMarkDone={markDone} />
    </AppShell>
  )
}
