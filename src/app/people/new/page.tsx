'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, useDefaultPrefs, prefsMatrixToPayload } from '@/components/forms/NotificationPrefs'
import { RELATIONSHIP_LABELS, GENDER_LABELS } from '@/lib/constants'

export default function NewPersonPage() {
  const router = useRouter()
  const defaultPrefs = useDefaultPrefs()
  const [prefsMatrix, setPrefsMatrix] = useState(defaultPrefs)

  useEffect(() => { setPrefsMatrix(defaultPrefs) }, [defaultPrefs])

  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState('unspecified')
  const [relationship, setRelationship] = useState('friend')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !birthdate) {
      setError('Name and birthdate are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createReminder({
        name: name.trim(),
        category: 'person',
        notes: notes || undefined,
        person_details: {
          birthdate,
          gender: gender as 'male' | 'female' | 'nonbinary' | 'unspecified',
          relationship: relationship as 'family' | 'partner' | 'friend' | 'colleague' | 'other',
        },
        recurrence_rules: {
          frequency: 'yearly',
          interval_count: 1,
          ends: 'never',
        },
        notification_preferences: prefsMatrixToPayload(prefsMatrix),
      })
      router.push('/people')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Add Person">
      <div className="max-w-xl mx-auto">
        <Link href="/people" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to People
        </Link>

        <h2 className="text-[22px] font-semibold text-[rgba(255,255,255,0.92)] mb-1">Add a person</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] mb-8">We&apos;ll track their age, zodiac sign, and days until their next birthday automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Basic info</h3>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Full name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Nafi"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60"
              />
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Birthdate *</label>
              <input
                type="date"
                required
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
                >
                  {Object.entries(GENDER_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Relationship</label>
                <select
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([key, { label, emoji }]) => (
                    <option key={key} value={key}>{emoji} {label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Gift ideas, preferences..."
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60 resize-none"
              />
            </div>
          </section>

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Notification preferences</h3>
            <p className="text-[12px] text-[rgba(255,255,255,0.38)]">Saved per person — not shared across your list.</p>
            <NotificationPrefsForm matrix={prefsMatrix} onChange={setPrefsMatrix} />
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-medium py-4 rounded-[8px] transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Add Person'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
