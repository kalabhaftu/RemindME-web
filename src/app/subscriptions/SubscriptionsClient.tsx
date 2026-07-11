'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { AppShell, AddButton } from '@/components/AppShell'
import { SubscriptionsTable } from '@/components/subscriptions/SubscriptionsTable'
import { ReminderItemWithDetails } from '@/app/actions/reminders'

export function SubscriptionsClient({ initialItems }: { initialItems: ReminderItemWithDetails[] }) {
  const [items, setItems] = useState(initialItems)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => { setItems(initialItems) }, [initialItems])
  useEffect(() => {
    const ch = supabase.channel('subs').on('postgres_changes', { event: '*', schema: 'public', table: 'reminder_items' }, () => router.refresh()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, router])

  return (
    <AppShell title="Subscriptions" action={<AddButton href="/subscriptions/new" label="Add" />}>
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold tracking-tight">Subscription Tracker</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] mt-1">Renewal dates, billing cycles, and per-service notification preferences.</p>
      </div>
      <SubscriptionsTable items={items} />
    </AppShell>
  )
}
