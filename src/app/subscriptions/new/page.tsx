'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createReminder } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'
import { NotificationPrefsForm, useDefaultPrefs, prefsMatrixToPayload } from '@/components/forms/NotificationPrefs'

export default function NewSubscriptionPage() {
  const router = useRouter()
  const defaultPrefs = useDefaultPrefs()
  const [prefsMatrix, setPrefsMatrix] = useState(defaultPrefs)

  useEffect(() => { setPrefsMatrix(defaultPrefs) }, [defaultPrefs])

  const [name, setName] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [billingAmount, setBillingAmount] = useState('')
  const [billingCurrency, setBillingCurrency] = useState('USD')
  const [cycle, setCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [notes, setNotes] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoDomain, setLogoDomain] = useState('')
  const [colorAccent, setColorAccent] = useState('')
  const [resolvingLogo, setResolvingLogo] = useState(false)
  const [ends, setEnds] = useState<'never' | 'after_occurrences' | 'on_date'>('never')
  const [endsValue, setEndsValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resolveLogo = async () => {
    if (!name.trim()) return
    setResolvingLogo(true)
    try {
      const res = await fetch('/api/logo-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: name.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.logoUrl) setLogoUrl(data.logoUrl)
        if (data.domain) setLogoDomain(data.domain)
        if (data.colorAccent) setColorAccent(data.colorAccent)
      }
    } catch { /* optional */ }
    finally { setResolvingLogo(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !renewalDate) {
      setError('Name and renewal date are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const freq = cycle === 'weekly' ? 'weekly' : cycle === 'yearly' ? 'yearly' : 'monthly'
      await createReminder({
        name: name.trim(),
        category: 'subscription',
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
        notification_preferences: prefsMatrixToPayload(prefsMatrix),
      })
      router.push('/subscriptions')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Add Subscription">
      <div className="max-w-xl mx-auto">
        <Link href="/subscriptions" className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Subscriptions
        </Link>

        <h2 className="text-[22px] font-semibold text-[rgba(255,255,255,0.92)] mb-1">Add a subscription</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] mb-8">Type the service name — we&apos;ll fetch the logo automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Service</h3>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={resolveLogo}
                placeholder="e.g. Claude, Netflix, Spotify"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60"
              />
              {resolvingLogo && <p className="text-xs text-[rgba(255,255,255,0.38)] mt-1">Fetching logo…</p>}
              {logoUrl && !resolvingLogo && (
                <div className="flex items-center gap-3 mt-3 p-3 bg-[rgba(0,0,0,0.2)] rounded-lg">
                  <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain" />
                  <span className="text-xs text-[rgba(255,255,255,0.6)]">Logo auto-fetched</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Renewal date *</label>
              <input type="date" required value={renewalDate} onChange={e => setRenewalDate(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Amount</label>
                <input type="number" step="0.01" value={billingAmount} onChange={e => setBillingAmount(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60" />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Currency</label>
                <select value={billingCurrency} onChange={e => setBillingCurrency(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Cycle</label>
                <select value={cycle} onChange={e => setCycle(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Repeat for</label>
              <div className="flex gap-3">
                <select value={ends} onChange={e => setEnds(e.target.value as typeof ends)}
                  className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60">
                  <option value="never">Forever</option>
                  <option value="after_occurrences">Number of renewals</option>
                  <option value="on_date">Until date</option>
                </select>
                {ends === 'after_occurrences' && (
                  <input type="number" min="1" value={endsValue} onChange={e => setEndsValue(e.target.value)} placeholder="e.g. 12"
                    className="w-28 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60" />
                )}
                {ends === 'on_date' && (
                  <input type="date" value={endsValue} onChange={e => setEndsValue(e.target.value)}
                    className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 resize-none" />
            </div>
          </section>

          <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-5 space-y-4">
            <h3 className="text-[13px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Notification preferences</h3>
            <NotificationPrefsForm matrix={prefsMatrix} onChange={setPrefsMatrix} />
          </section>

          <button type="submit" disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-medium py-4 rounded-[8px] transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Add Subscription'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
