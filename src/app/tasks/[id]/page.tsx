import { getReminder } from '@/app/actions/reminders'
import { notFound } from 'next/navigation'
import { TaskDetailClient } from './TaskDetailClient'

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getReminder(id)
  if (!item || item.category !== 'task') notFound()
  return <TaskDetailClient item={item} />
}
