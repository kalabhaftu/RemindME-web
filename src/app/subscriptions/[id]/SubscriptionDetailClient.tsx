'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Trash2, CreditCard, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Modal } from '@/components/ui/Modal'
import { TagPill } from '@/components/ui/TagPill'
import { ReminderItemWithDetails, deleteReminder } from '@/app/actions/reminders'
import { GlassCard, GlassButton } from '@/components/liquid-glass'

export function SubscriptionDetailClient({ item }: { item: ReminderItemWithDetails }) {
  const router = useRouter()
  const s = item.subscription_details
  const renewalDate = s?.renewal_date
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleDelete = async () => {
    if (isPending) return
    setIsPending(true)
    try {
      await deleteReminder(item.id)
      router.push('/subscriptions')
      router.refresh()
    } catch {
      setIsPending(false)
    }
  }

  const bgColor = item.color_accent || '#3B82F6'

  return (
    <AppShell title={item.name}>
      <div className="max-w-2xl mx-auto">
        <Link href="/subscriptions" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Subscriptions
        </Link>

        <GlassCard tint={0.5} blur={14} className="rounded-[24px] p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] overflow-hidden"
                style={{ backgroundColor: `${bgColor}20` }}
              >
                {s?.logo_url ? (
                  <img src={s.logo_url} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <CreditCard size={24} style={{ color: bgColor }} />
                )}
              </div>
              <div>
                <h2 className="text-[22px] font-semibold">{item.name}</h2>
                {renewalDate && (
                  <p className="text-[13px] font-mono text-[rgba(255,255,255,0.45)] mt-1">
                    Next renewal: {format(parseISO(renewalDate), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton asChild size="sm">
                <Link href={`/subscriptions/${item.id}/edit`}>Edit</Link>
              </GlassButton>
              <GlassButton size="sm" onClick={() => setIsDeleting(true)} className="w-9 h-8 !px-0 text-red-400" aria-label="Delete">
                <Trash2 size={16} />
              </GlassButton>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
              <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Billing Amount</div>
              <div className="text-[20px] font-mono font-semibold mt-1">
                {s?.billing_amount ? `${s.billing_amount} ${s.billing_currency}` : '-'}
              </div>
            </div>
            <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
              <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Cycle</div>
              <div className="text-[14px] mt-2 capitalize">{s?.cycle ?? '-'}</div>
            </div>
            <div className="p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
              <div className="text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.38)]">Status</div>
              <div className="mt-2">
                <TagPill color="rgba(34,197,94,0.15)">Active</TagPill>
              </div>
            </div>
          </div>

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
