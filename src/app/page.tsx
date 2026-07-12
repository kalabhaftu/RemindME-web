import { getReminders } from './actions/reminders'
import DashboardClient from './DashboardClient'

export default async function Page() {
  let reminders: any[] = []
  try {
    reminders = await getReminders()
  } catch (error: any) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center text-red-400">
        Error loading reminders: {error?.message || "Unknown error"}
      </main>
    )
  }
  return <DashboardClient initialReminders={reminders} />
}
