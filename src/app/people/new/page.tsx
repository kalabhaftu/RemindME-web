'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, useDefaultPrefs, prefsMatrixToPayload } from '@/components/forms/NotificationPrefs'
import { CustomSelect } from '@/components/forms/CustomSelect'
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
  const [customRelationship, setCustomRelationship] = useState('')
  const [notes, setNotes] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
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
          custom_relationship: relationship === 'other' ? customRelationship.trim() : undefined,
          avatar_url: avatarUrl || undefined,
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

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[rgba(255,255,255,0.2)] text-xs">No image</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingAvatar}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingAvatar(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await fetch('/api/cloudinary/upload', {
                        method: 'POST',
                        body: formData,
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.url) setAvatarUrl(data.url);
                      } else {
                        setError('Failed to upload image');
                      }
                    } catch (err) {
                      setError('Error uploading image');
                    } finally {
                      setUploadingAvatar(false);
                    }
                  }}
                  className="block w-full text-sm text-[rgba(255,255,255,0.6)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-[rgba(255,255,255,0.05)] file:text-white hover:file:bg-[rgba(255,255,255,0.1)] transition-colors"
                />
              </div>
            </div>

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
                <CustomSelect
                  value={gender}
                  onChange={setGender}
                  options={Object.entries(GENDER_LABELS).map(([value, { label }]) => ({ value, label }))}
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Relationship</label>
                <CustomSelect
                  value={relationship}
                  onChange={setRelationship}
                  options={Object.entries(RELATIONSHIP_LABELS).map(([value, { label, emoji }]) => ({ value, label: `${emoji} ${label}` }))}
                />
              </div>
            </div>

            {relationship === 'other' && (
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Custom Relationship</label>
                <input
                  type="text"
                  required
                  value={customRelationship}
                  onChange={e => setCustomRelationship(e.target.value)}
                  placeholder="e.g. Neighbor, Mentor"
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60"
                />
              </div>
            )}

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
