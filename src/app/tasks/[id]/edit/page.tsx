'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getReminder, updateReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, prefsMatrixToPayload, PrefsMatrix } from '@/components/forms/NotificationPrefs'
import { prefsFromItem } from '@/lib/prefs-utils'
import { TASK_ICONS } from '@/components/tasks/TasksTable'
import { cn } from '@/lib/cn'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { format, parseISO } from 'date-fns'
import { localTimeZone } from '@/lib/local-time'
import { CustomSelect } from '@/components/forms/CustomSelect'
import { GlassCard, GlassButton } from '@/components/liquid-glass'

function toDatetimeLocal(iso: string): string {
  const d = parseISO(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [item, setItem] = useState<ReminderItemWithDetails | null>(null)
  const [prefsMatrix, setPrefsMatrix] = useState<PrefsMatrix | null>(null)
  const [name, setName] = useState('')
  const [iconKey, setIconKey] = useState('trash')
  const [dueAt, setDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      getReminder(id).then(data => {
        if (!data || data.category !== 'task') {
          router.push('/tasks')
          return
        }
        setItem(data)
        setName(data.name)
        setNotes(data.notes ?? '')
        setIconKey(data.icon_key ?? 'trash')
        const t = data.task_details
        if (t) {
          setDueAt(t.due_at ? (t.due_at.length === 10 ? `${t.due_at}T00:00` : t.due_at.slice(0, 16)) : '')
        }
        const rr = data.recurrence_rules
        if (rr) setFrequency(rr.frequency as typeof frequency)
        setPrefsMatrix(prefsFromItem(data))
      })
    })
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !name.trim() || !dueAt) {
      setError('Name and due date are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await updateReminder(item.id, {
        name: name.trim(),
        icon_key: iconKey,
        notes: notes || undefined,
        timezone: localTimeZone(),
        task_details: { due_at: new Date(dueAt).toISOString() },
        recurrence_rules: {
          frequency,
          interval_count: 1,
          ends: (item.recurrence_rules?.ends as 'never' | 'after_occurrences' | 'on_date') ?? 'never',
          ends_value: item.recurrence_rules?.ends_value ?? undefined,
        },
        notification_preferences: prefsMatrix ? prefsMatrixToPayload(prefsMatrix) : [],
      })
      router.push('/tasks')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  if (!item || !prefsMatrix) {
    return (
      <AppShell title="Edit Task">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Edit Task">
      <div className="max-w-xl mx-auto">
        <Link href="/tasks" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>

        <h2 className="text-[22px] font-semibold mb-8">Edit {item.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <GlassCard tint={0.48} blur={14} className="rounded-[24px] p-6 space-y-4">
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Task name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-3">Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {TASK_ICONS.map(({ key, label, Icon }) => (
                  <button key={key} type="button" onClick={() => setIconKey(key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                      iconKey === key ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.15)]' : 'border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)]'
                    )}>
                    <Icon size={20} weight="fill" className="text-[#3B82F6]" />
                    <span className="text-[10px] text-[rgba(255,255,255,0.45)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Due date & time *</label>
              <input type="datetime-local" required value={dueAt} onChange={e => setDueAt(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" style={{ colorScheme: 'dark' }} />
              <p className="mt-2 text-[11px] text-[rgba(255,255,255,0.42)]">Uses your device time zone: {localTimeZone()}</p>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Repeat</label>
              <CustomSelect
                value={frequency}
                onChange={(v) => setFrequency(v as typeof frequency)}
                options={[
                  { value: 'none', label: 'Once' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 resize-none focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
          </GlassCard>

          <GlassCard tint={0.48} blur={14} className="rounded-[24px] p-6 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Notification preferences</h3>
            <NotificationPrefsForm matrix={prefsMatrix} onChange={setPrefsMatrix} />
          </GlassCard>

          <GlassButton type="submit" material="tinted" size="lg" disabled={loading}
            className="w-full bg-[#3B82F6] text-white">
            {loading ? 'Saving...' : 'Save Changes'}
          </GlassButton>
        </form>
      </div>
    </AppShell>
  )
}
