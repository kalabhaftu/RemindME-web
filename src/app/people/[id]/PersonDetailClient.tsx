'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Trash2, User, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Modal } from '@/components/ui/Modal'
import { TagPill } from '@/components/ui/TagPill'
import { ReminderItemWithDetails, deleteReminder } from '@/app/actions/reminders'
import { getAge, getDaysUntilBirthday, getZodiacSign } from '@/utils/computed'
import { GENDER_LABELS, RELATIONSHIP_LABELS, ZODIAC_META } from '@/lib/constants'
import { GlassCard, GlassButton } from '@/components/liquid-glass'

export function PersonDetailClient({ item }: { item: ReminderItemWithDetails }) {
  const router = useRouter()
  const p = item.person_details
  const birthdate = p?.birthdate

  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleDelete = async () => {
    if (isPending) return
    setIsPending(true)
    try {
      await deleteReminder(item.id)
      router.push('/people')
      router.refresh()
    } catch {
      setIsPending(false)
    }
  }

  const age = birthdate ? getAge(birthdate) : null
  const days = birthdate ? getDaysUntilBirthday(birthdate) : null
  const zodiac = birthdate ? getZodiacSign(birthdate) : null
  const defaultGender = { label: '—', color: 'rgba(255,255,255,0.06)' }
  const gender = (p?.gender && GENDER_LABELS[p.gender]) ? GENDER_LABELS[p.gender] : defaultGender
  const rel = RELATIONSHIP_LABELS[p?.relationship ?? 'other']
  const zodiacMeta = zodiac ? ZODIAC_META[zodiac] : null

  return (
    <AppShell title={item.name}>
      <div className="max-w-2xl mx-auto">
        <Link href="/people" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to People
        </Link>

        <GlassCard tint={0.5} blur={14} className="rounded-[24px] p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[rgba(59,130,246,0.15)] flex items-center justify-center">
                <User size={24} className="text-[#3B82F6]" />
              </div>
              <div>
                <h2 className="text-[22px] font-semibold">{item.name}</h2>
                {birthdate && (
                  <p className="text-[13px] font-mono text-[rgba(255,255,255,0.45)] mt-1">
                    {format(parseISO(birthdate), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton asChild size="sm">
                <Link href={`/people/${item.id}/edit`}>Edit</Link>
              </GlassButton>
              <GlassButton size="sm" onClick={() => setIsDeleting(true)} className="w-9 h-8 !px-0 text-red-400" aria-label="Delete">
                <Trash2 size={16} />
              </GlassButton>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {age !== null && (
              <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Age</div>
                <div className="text-[20px] font-mono font-semibold mt-1">{age}</div>
              </div>
            )}
            {days !== null && (
              <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Days to birthday</div>
                <div className="text-[20px] font-mono font-semibold mt-1 text-[#3B82F6]">{days}</div>
              </div>
            )}
            {zodiac && zodiacMeta && (
              <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Zodiac</div>
                <TagPill color={zodiacMeta.color} className="mt-2">{zodiacMeta.glyph} {zodiac}</TagPill>
              </div>
            )}
            <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
              <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Relationship</div>
              <div className="text-[14px] mt-2">{rel.emoji} {rel.label}</div>
            </div>
          </div>

          {gender.label !== '—' && (
            <div className="flex gap-2">
              <TagPill color={gender.color}>{gender.label}</TagPill>
            </div>
          )}

          {item.notes && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)] mb-2">Notes</div>
              <p className="text-[14px] text-[rgba(255,255,255,0.7)]">{item.notes}</p>
            </div>
          )}

          {item.notification_preferences && item.notification_preferences.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)] mb-2">Notifications</div>
              <div className="flex flex-wrap gap-2">
                {item.notification_preferences.filter(p => p.enabled).map(p => (
                  <TagPill key={p.channel} color="rgba(59,130,246,0.15)">
                    {p.channel.replace('_', ' ')} · {p.lead_time.replace('_', ' ')}
                  </TagPill>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <Modal isOpen={isDeleting} onClose={() => setIsDeleting(false)} title="Confirm Delete">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[var(--text-secondary)]">Are you sure you want to delete <span className="text-white font-medium">{item.name}</span>?</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 w-full mt-4">
            <GlassButton
              onClick={() => setIsDeleting(false)}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              material="tinted"
              disabled={isPending}
              onClick={handleDelete}
              className="flex-1 bg-red-500/25 text-red-300"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </GlassButton>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
