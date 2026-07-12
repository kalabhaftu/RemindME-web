'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, useDefaultPrefs, prefsMatrixToPayload } from '@/components/forms/NotificationPrefs'

export default function NewCustomHolidayPage() {
  const router = useRouter()
  const defaultPrefs = useDefaultPrefs()
  const [prefsMatrix, setPrefsMatrix] = useState(defaultPrefs)

  useEffect(() => { setPrefsMatrix(defaultPrefs) }, [defaultPrefs])

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date) {
      setError('Name and date are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createReminder({
        name: name.trim(),
        category: 'custom_holiday',
        notes: notes || undefined,
        holiday_details: {
          holiday_date: date,
          is_custom: true,
          holiday_key: `custom-${Date.now()}`,
          country_code: 'CUSTOM'
        },
        recurrence_rules: {
          frequency: 'yearly',
          interval_count: 1,
          ends: 'never',
        },
        notification_preferences: prefsMatrixToPayload(prefsMatrix),
      })
      router.push('/holidays')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create holiday')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Add Custom Event">
      <div className="max-w-xl mx-auto">
        <Link href="/holidays" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Holidays
        </Link>

        <h2 className="text-[22px] font-semibold text-[rgba(255,255,255,0.92)] mb-1">Add a custom event</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] mb-8">Create your own repeating events like Anniversaries or Graduations.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Event name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Wedding Anniversary"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60"
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Gift ideas, plans..."
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60 resize-none"
              />
            </div>
          </section>

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Notification preferences</h3>
            <NotificationPrefsForm matrix={prefsMatrix} onChange={setPrefsMatrix} />
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-medium py-4 rounded-[8px] transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Add Event'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
