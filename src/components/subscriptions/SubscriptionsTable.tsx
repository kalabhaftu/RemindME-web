'use client'

import { useMemo, useState } from 'react'
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns'
import { CreditCard } from 'lucide-react'
import Link from 'next/link'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { EmptyState } from '@/components/EmptyState'

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
        const da = a.subscription_details?.renewal_date
        const db = b.subscription_details?.renewal_date
        if (!da || !db) return 0
        return daysUntilRenewal(da) - daysUntilRenewal(db)
      })
  }, [items, search])

  if (items.filter(i => i.category === 'subscription').length === 0) {
    return (
      <EmptyState
        iconPath="/icons/3d/empty_subscriptions.png"
        message="No subscriptions yet. Track renewals for Netflix, Claude, Spotify, and more."
      />
    )
  }

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search subscriptions..."
        className="w-full max-w-sm px-5 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full text-xs text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all font-medium"
      />

      <div 
        className="overflow-x-auto rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[rgba(15,18,28,0.45)] backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] no-scrollbar"
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
        }}
      >
        <table className="w-full min-w-0 text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <th className="px-4 py-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Service</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)] hidden sm:table-cell">Renewal</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Amount</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Days left</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)] hidden md:table-cell">Cycle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item => {
              const s = item.subscription_details
              const days = s?.renewal_date ? daysUntilRenewal(s.renewal_date) : null
              return (
                <tr key={item.id} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/subscriptions/${item.id}`} className="flex items-center gap-3 group-hover:text-[#5B9CFF] transition-colors">
                      {s?.logo_url ? (
                        <img src={s.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-[rgba(255,255,255,0.06)]" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.15)] flex items-center justify-center shrink-0">
                          <CreditCard size={14} className="text-[#3B82F6]" />
                        </div>
                      )}
                      <span className="text-[14px] font-medium text-[rgba(255,255,255,0.92)]">{item.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[rgba(255,255,255,0.6)] hidden sm:table-cell">
                    {s?.renewal_date ? format(parseISO(s.renewal_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[rgba(255,255,255,0.6)]">
                    {s?.billing_amount ? `${s.billing_currency ?? 'USD'} ${s.billing_amount}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {days !== null ? (
                      <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.08)] rounded font-mono text-[13px]">{days} days</span>
                    ) : (
                      <span className="text-[13px] text-[rgba(255,255,255,0.45)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] capitalize text-[rgba(255,255,255,0.6)] hidden md:table-cell">{s?.cycle ?? 'monthly'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
