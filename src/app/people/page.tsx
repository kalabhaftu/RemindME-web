import { getReminders } from '@/app/actions/reminders'
import { PeopleClient } from './PeopleClient'

export default async function PeoplePage() {
  let items = []
  try {
    const all = await getReminders()
    items = all.filter(i => i.category === 'person')
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-[rgba(255,255,255,0.6)]">
        Please log in to view people.
      </main>
    )
  }
  return <PeopleClient initialItems={items} />
}
