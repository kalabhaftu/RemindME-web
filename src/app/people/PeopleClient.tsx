'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AppShell, AddButton } from '@/components/AppShell'
import { PeopleTable } from '@/components/people/PeopleTable'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { useRouter } from 'next/navigation'

export function PeopleClient({ initialItems }: { initialItems: ReminderItemWithDetails[] }) {
  const [items, setItems] = useState(initialItems)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    const channel = supabase
      .channel('people_reminders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminder_items' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, router])

  const people = items.filter(i => i.category === 'person')

  return (
    <AppShell
      title="People"
      action={<AddButton href="/people/new" label="Add Person" />}
    >
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold text-[rgba(255,255,255,0.92)] tracking-tight">Birthday Tracker</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] mt-1">Contacts, relationships, and upcoming birthdays — sorted by what&apos;s coming next.</p>
      </div>
      <PeopleTable items={people} />
    </AppShell>
  )
}
