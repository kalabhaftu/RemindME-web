import { getReminder } from '@/app/actions/reminders'
import { notFound } from 'next/navigation'
import { SubscriptionDetailClient } from './SubscriptionDetailClient'

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getReminder(id)
  if (!item || item.category !== 'subscription') notFound()
  return <SubscriptionDetailClient item={item} />
}
