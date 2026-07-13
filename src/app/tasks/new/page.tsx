'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, useDefaultPrefs, prefsMatrixToPayload } from '@/components/forms/NotificationPrefs'
import { TASK_ICONS } from '@/components/tasks/TasksTable'
import { cn } from '@/lib/cn'

export default function NewTaskPage() {
  const router = useRouter()
  const defaultPrefs = useDefaultPrefs()
  const [prefsMatrix, setPrefsMatrix] = useState(defaultPrefs)
  useEffect(() => { setPrefsMatrix(defaultPrefs) }, [defaultPrefs])

  const [name, setName] = useState('')
  const [iconKey, setIconKey] = useState('trash')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [ends, setEnds] = useState<'never' | 'after_occurrences' | 'on_date'>('never')
  const [endsValue, setEndsValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !dueAt) {
      setError('Name and due date are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createReminder({
        name: name.trim(),
        category: 'task',
        icon_key: iconKey,
        notes: notes || undefined,
        task_details: { due_at: new Date(dueAt).toISOString() },
        recurrence_rules: {
          frequency,
          interval_count: 1,
          ends,
          ends_value: ends !== 'never' ? endsValue : undefined,
        },
        notification_preferences: prefsMatrixToPayload(prefsMatrix),
      })
      router.push('/tasks')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Add Task">
      <div className="max-w-xl mx-auto">
        <Link href="/tasks" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Tasks
        </Link>

        <h2 className="text-[22px] font-semibold mb-8">Add a task</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Task name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Take out trash"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-3">Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {TASK_ICONS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIconKey(key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                      iconKey === key
                        ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.15)]'
                        : 'border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)]'
                    )}
                  >
                    <Icon size={20} weight="fill" className="text-[#3B82F6]" />
                    <span className="text-[10px] text-[rgba(255,255,255,0.45)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Due date & time *</label>
              <input type="datetime-local" required value={dueAt} onChange={e => setDueAt(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60" style={{ colorScheme: 'dark' }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Repeat</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60">
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {frequency !== 'none' && (
                <div>
                  <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Ends</label>
                  <select value={ends} onChange={e => setEnds(e.target.value as typeof ends)}
                    className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60">
                    <option value="never">Forever</option>
                    <option value="after_occurrences">After N times</option>
                    <option value="on_date">On date</option>
                  </select>
                </div>
              )}
            </div>

            {frequency !== 'none' && ends !== 'never' && (
              <input
                type={ends === 'on_date' ? 'date' : 'number'}
                value={endsValue}
                onChange={e => setEndsValue(e.target.value)}
                placeholder={ends === 'after_occurrences' ? 'Number of times' : ''}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60"
              />
            )}

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 resize-none focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
          </section>

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Notification preferences</h3>
            <NotificationPrefsForm matrix={prefsMatrix} onChange={setPrefsMatrix} />
          </section>

          <button type="submit" disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-medium py-4 rounded-[8px] disabled:opacity-50">
            {loading ? 'Saving...' : 'Add Task'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
