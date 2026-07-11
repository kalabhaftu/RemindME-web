import { getReminder } from '@/app/actions/reminders'
import { notFound } from 'next/navigation'
import { PersonDetailClient } from './PersonDetailClient'

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getReminder(id)
  if (!item || item.category !== 'person') notFound()
  return <PersonDetailClient item={item} />
}
