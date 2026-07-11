import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { PrefsMatrix } from '@/components/forms/NotificationPrefs'

export function prefsFromItem(item: ReminderItemWithDetails): PrefsMatrix {
  const base: PrefsMatrix = {
    email: { enabled: false, lead_time: 'morning_of', custom_time: '09:00', offset_days: 0 },
    push: { enabled: false, lead_time: 'morning_of', custom_time: '09:00', offset_days: 0 },
    telegram: { enabled: false, lead_time: 'morning_of', custom_time: '09:00', offset_days: 0 },
    in_app: { enabled: false, lead_time: 'at_time', custom_time: '09:00', offset_days: 0 },
  }
  for (const p of item.notification_preferences ?? []) {
    if (p.enabled) {
      base[p.channel] = {
        enabled: true,
        lead_time: p.lead_time,
        custom_time: p.custom_time?.slice(0, 5) ?? '09:00',
        offset_days: (p as { offset_days?: number }).offset_days ?? 0,
      }
    }
  }
  return base
}
