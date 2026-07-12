import { getReminders } from './actions/reminders'
import DashboardClient from './DashboardClient'
import { redirect } from 'next/navigation'

export default async function Page() {
  let reminders: any[] = []
  try {
    reminders = await getReminders()
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message?.includes('log in')) {
      redirect('/login')
    }
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center text-red-400">
        Error loading reminders: {error?.message || "Unknown error"}
      </main>
    )
  }
  return <DashboardClient initialReminders={reminders} />
}
