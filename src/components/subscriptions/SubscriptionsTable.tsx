'use client'

import { useMemo, useState } from 'react'
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns'
import { CreditCard } from 'lucide-react'
import Link from 'next/link'
import { ReminderItemWithDetails } from '@/app/actions/reminders'

function daysUntilRenewal(dateStr: string): number {
  const today = startOfDay(new Date())
  const renewal = parseISO(dateStr)
  let next = renewal
  while (next < today) {
    next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate())
  }
  return differenceInDays(next, today)
}

export function SubscriptionsTable({ items }: { items: ReminderItemWithDetails[] }) {
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    return items
      .filter(i => i.category === 'subscription')
      .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const da = a.subscription_details?.[0]?.renewal_date
        const db = b.subscription_details?.[0]?.renewal_date
        if (!da || !db) return 0
        return daysUntilRenewal(da) - daysUntilRenewal(db)
      })
  }, [items, search])

  if (items.filter(i => i.category === 'subscription').length === 0) {
    return (
      <div className="p-16 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
        <CreditCard size={40} className="mx-auto text-[rgba(255,255,255,0.1)] mb-4" />
        <h3 className="text-[15px] font-medium text-[rgba(255,255,255,0.6)] mb-2">No subscriptions yet</h3>
        <p className="text-[13px] text-[rgba(255,255,255,0.38)] mb-6">Track renewals for Netflix, Claude, Spotify, and more.</p>
        <Link href="/subscriptions/new" className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-5 py-2.5 rounded-[8px] text-sm font-medium transition-colors">
          Add subscription
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search subscriptions..."
        className="w-full max-w-sm px-4 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] text-sm focus:outline-none focus:border-[#3B82F6]/60"
      />

      <div className="overflow-x-auto rounded-[12px] border border-[rgba(255,255,255,0.08)]">
        <table className="w-full min-w-[700px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
              {['Service', 'Renewal', 'Amount', 'Days left', 'Cycle'].map(h => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(item => {
              const s = item.subscription_details?.[0]
              if (!s?.renewal_date) return null
              const days = daysUntilRenewal(s.renewal_date)
              return (
                <tr key={item.id} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-[rgba(255,255,255,0.06)]" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.15)] flex items-center justify-center">
                          <CreditCard size={14} className="text-[#3B82F6]" />
                        </div>
                      )}
                      <span className="text-[14px] font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[rgba(255,255,255,0.6)]">
                    {format(parseISO(s.renewal_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[rgba(255,255,255,0.6)]">
                    {s.billing_amount ? `${s.billing_currency ?? 'USD'} ${s.billing_amount}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.08)] rounded font-mono text-[13px]">{days} days</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] capitalize text-[rgba(255,255,255,0.6)]">{s.cycle ?? 'monthly'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
