import { getReminders } from './actions/reminders'
import DashboardClient from './DashboardClient'

export default async function Page() {
  let reminders: any[] = []
  try {
    reminders = await getReminders()
  } catch (error) {
    // Basic fallback for unauthenticated users, handled by middleware usually
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center text-[rgba(255,255,255,0.6)]">
        Please log in to view your reminders.
      </main>
    )
  }
  return <DashboardClient initialReminders={reminders} />
}
