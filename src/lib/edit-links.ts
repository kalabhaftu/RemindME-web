import { ReminderItemWithDetails } from '@/app/actions/reminders'

export function getEditHref(item: ReminderItemWithDetails): string {
  switch (item.category) {
    case 'person':
      return `/people/${item.id}/edit`
    case 'subscription':
      return `/subscriptions/${item.id}/edit`
    case 'task':
      return `/tasks/${item.id}/edit`
    case 'custom_holiday':
      return '/holidays'
    default:
      return '/'
  }
}
