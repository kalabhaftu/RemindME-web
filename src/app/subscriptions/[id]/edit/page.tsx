'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getReminder, updateReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, prefsMatrixToPayload, PrefsMatrix } from '@/components/forms/NotificationPrefs'
import { prefsFromItem } from '@/lib/prefs-utils'
import { ReminderItemWithDetails } from '@/app/actions/reminders'

export default function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [item, setItem] = useState<ReminderItemWithDetails | null>(null)
  const [prefsMatrix, setPrefsMatrix] = useState<PrefsMatrix | null>(null)
  const [name, setName] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [billingAmount, setBillingAmount] = useState('')
  const [billingCurrency, setBillingCurrency] = useState('USD')
  const [cycle, setCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [notes, setNotes] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoDomain, setLogoDomain] = useState('')
  const [colorAccent, setColorAccent] = useState('')
  const [ends, setEnds] = useState<'never' | 'after_occurrences' | 'on_date'>('never')
  const [endsValue, setEndsValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      getReminder(id).then(data => {
        if (!data || data.category !== 'subscription') {
          router.push('/subscriptions')
          return
        }
        setItem(data)
        setName(data.name)
        setNotes(data.notes ?? '')
        const s = data.subscription_details?.[0]
        if (s) {
          setRenewalDate(s.renewal_date ?? '')
          setBillingAmount(s.billing_amount?.toString() ?? '')
          setBillingCurrency(s.billing_currency ?? 'USD')
          setCycle((s.cycle as 'weekly' | 'monthly' | 'yearly') ?? 'monthly')
          setLogoUrl(s.logo_url ?? '')
          setLogoDomain(s.logo_domain ?? '')
          setColorAccent(data.color_accent ?? '')
        }
        const rr = data.recurrence_rules?.[0]
        if (rr) {
          setEnds(rr.ends)
          setEndsValue(rr.ends_value ?? '')
        }
        setPrefsMatrix(prefsFromItem(data))
      })
    })
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !name.trim() || !renewalDate) {
      setError('Name and renewal date are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const freq = cycle === 'weekly' ? 'weekly' : cycle === 'yearly' ? 'yearly' : 'monthly'
      await updateReminder(item.id, {
        name: name.trim(),
        notes: notes || undefined,
        color_accent: colorAccent || undefined,
        subscription_details: {
          logo_url: logoUrl || undefined,
          logo_domain: logoDomain || undefined,
          billing_amount: billingAmount ? parseFloat(billingAmount) : undefined,
          billing_currency: billingCurrency,
          renewal_date: renewalDate,
          cycle,
        },
        recurrence_rules: {
          frequency: freq as 'weekly' | 'monthly' | 'yearly',
          interval_count: 1,
          ends,
          ends_value: ends !== 'never' ? endsValue : undefined,
        },
        notification_preferences: prefsMatrix ? prefsMatrixToPayload(prefsMatrix) : [],
      })
      router.push('/subscriptions')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  if (!item || !prefsMatrix) {
    return (
      <AppShell title="Edit Subscription">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Edit Subscription">
      <div className="max-w-xl mx-auto">
        <Link href="/subscriptions" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>

        <h2 className="text-[22px] font-semibold mb-8">Edit {item.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            {logoUrl && (
              <div className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain" />
              </div>
            )}
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Renewal date *</label>
              <input type="date" required value={renewalDate} onChange={e => setRenewalDate(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Amount</label>
                <input type="number" step="0.01" value={billingAmount} onChange={e => setBillingAmount(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60" />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Currency</label>
                <select value={billingCurrency} onChange={e => setBillingCurrency(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Cycle</label>
                <select value={cycle} onChange={e => setCycle(e.target.value as typeof cycle)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#3B82F6]/60">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
