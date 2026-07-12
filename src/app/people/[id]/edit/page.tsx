'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getReminder, updateReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, prefsMatrixToPayload, PrefsMatrix } from '@/components/forms/NotificationPrefs'
import { prefsFromItem } from '@/lib/prefs-utils'
import { RELATIONSHIP_LABELS, GENDER_LABELS } from '@/lib/constants'
import { ReminderItemWithDetails } from '@/app/actions/reminders'

export default function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [item, setItem] = useState<ReminderItemWithDetails | null>(null)
  const [prefsMatrix, setPrefsMatrix] = useState<PrefsMatrix | null>(null)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState('unspecified')
  const [relationship, setRelationship] = useState('friend')
  const [notes, setNotes] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      getReminder(id).then(data => {
        if (!data || data.category !== 'person') {
          router.push('/people')
          return
        }
        setItem(data)
        setName(data.name)
        setNotes(data.notes ?? '')
        const p = data.person_details?.[0]
        if (p) {
          setBirthdate(p.birthdate ?? '')
          setGender(p.gender ?? 'unspecified')
          setRelationship(p.relationship ?? 'friend')
          setAvatarUrl(p.avatar_url ?? '')
        }
        setPrefsMatrix(prefsFromItem(data))
      })
    })
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !name.trim() || !birthdate) {
      setError('Name and birthdate are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await updateReminder(item.id, {
        name: name.trim(),
        notes: notes || undefined,
        person_details: {
          birthdate,
          gender: gender as 'male' | 'female' | 'nonbinary' | 'unspecified',
          relationship: relationship as 'family' | 'partner' | 'friend' | 'colleague' | 'other',
          avatar_url: avatarUrl || undefined,
        },
        notification_preferences: prefsMatrix ? prefsMatrixToPayload(prefsMatrix) : [],
      })
      router.push(`/people/${item.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  if (!item || !prefsMatrix) {
    return (
      <AppShell title="Edit Person">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Edit Person">
      <div className="max-w-xl mx-auto">
        <Link href={`/people/${item.id}`} className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>

        <h2 className="text-[22px] font-semibold mb-8">Edit {item.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <div className="flex items-center gap-4 mb-4">
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
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Birthdate *</label>
              <input type="date" required value={birthdate} onChange={e => setBirthdate(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60">
                  {Object.entries(GENDER_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Relationship</label>
                <select value={relationship} onChange={e => setRelationship(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60">
                  {Object.entries(RELATIONSHIP_LABELS).map(([key, { label, emoji }]) => (
                    <option key={key} value={key}>{emoji} {label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 resize-none focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
          </section>

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Notification preferences</h3>
            <NotificationPrefsForm matrix={prefsMatrix} onChange={setPrefsMatrix} />
          </section>

          <button type="submit" disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-medium py-4 rounded-[8px] disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
