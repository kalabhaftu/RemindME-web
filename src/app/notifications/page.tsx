import { getReminders } from '@/app/actions/reminders'
import { createClient } from '@/utils/supabase/server'
import { NotificationsClient } from './NotificationsClient'

export default async function NotificationsPage() {
  try {
    const [reminders, supabase] = await Promise.all([
      getReminders(),
      createClient(),
    ])

    const { data: { user } } = await supabase.auth.getUser()
    let notifications: Array<{
      id: string
      title: string
      body: string | null
      read_at: string | null
      created_at: string
      reminder_item_id: string | null
    }> = []

    if (user) {
      const { data } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) notifications = data
    }

    return <NotificationsClient reminders={reminders} initialNotifications={notifications} />
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-[rgba(255,255,255,0.6)]">
        Please log in to view notifications.
      </main>
    )
  }
}
