import { getReminders } from '@/app/actions/reminders'
import { SubscriptionsClient } from './SubscriptionsClient'

export default async function SubscriptionsPage() {
  try {
    const all = await getReminders()
    const items = all.filter(i => i.category === 'subscription')
    return <SubscriptionsClient initialItems={items} />
  } catch {
    return <main className="min-h-screen flex items-center justify-center p-6 text-[rgba(255,255,255,0.6)] text-center">Database Error: Please run <code>npx supabase db push</code> to create your database tables.</main>
  }
}
