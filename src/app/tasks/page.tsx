import { getReminders } from '@/app/actions/reminders'
import { TasksClient } from './TasksClient'

export default async function TasksPage() {
  try {
    const all = await getReminders()
    return <TasksClient initialItems={all.filter(i => i.category === 'task')} />
  } catch {
    return <main className="min-h-screen flex items-center justify-center p-6 text-[rgba(255,255,255,0.6)]">Please log in.</main>
  }
}
