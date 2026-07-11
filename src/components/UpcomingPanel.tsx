'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ReminderOccurrence } from '@/utils/computed-fields'
import { getZodiacSign } from '@/utils/computed'
import { getEditHref } from '@/lib/edit-links'
import { snoozeReminder } from '@/app/actions/reminders'
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { Circle, Edit2, CheckCircle2, BellRing } from 'lucide-react'

interface UpcomingPanelProps {
  filter: '3d' | '7d' | 'month'
  setFilter: (f: '3d' | '7d' | 'month') => void
  occurrences: ReminderOccurrence[]
  onMarkDone: (id: string, date: string) => void
  onSnoozed?: () => void
}

export function UpcomingPanel({ filter, setFilter, occurrences, onMarkDone, onSnoozed }: UpcomingPanelProps) {
  const [snoozing, setSnoozing] = useState<string | null>(null)

  const handleSnooze = async (id: string, date: string) => {
    const key = `${id}-${date}`
    setSnoozing(key)
    try {
      await snoozeReminder(id, date, 1)
      onSnoozed?.()
    } catch { /* silent */ }
    finally { setSnoozing(null) }
  }
  const renderItemDetails = (occ: ReminderOccurrence) => {
    const item = occ.item
    if (item.category === 'person' && item.person_details?.length) {
      const p = item.person_details[0]
      if (!p.birthdate) return null
      // We calculate age at the occurrence date
      const age = new Date(occ.date).getFullYear() - new Date(p.birthdate).getFullYear()
      const zodiac = getZodiacSign(p.birthdate)
      return (
        <div className="flex gap-4 mt-2 text-[12px] font-mono text-[rgba(255,255,255,0.6)]">
          <span>Turns {age}</span>
          <span>•</span>
          <span>{zodiac}</span>
        </div>
      )
    }
    
    if (item.category === 'subscription' && item.subscription_details?.length) {
      const s = item.subscription_details[0]
      return (
        <div className="flex items-center gap-4 mt-2 text-[12px] font-mono text-[rgba(255,255,255,0.6)]">
          {s.logo_url && <img src={s.logo_url} alt="" className="w-4 h-4 rounded object-contain bg-[rgba(255,255,255,0.06)]" />}
          <span>{s.billing_currency} {s.billing_amount} / {s.cycle}</span>
        </div>
      )
    }

    if (item.category === 'task') {
      return (
        <div className="flex gap-4 mt-2 text-[12px] font-mono text-[rgba(255,255,255,0.6)]">
          <span>Due: {format(occ.date, 'MMM d, yyyy')}</span>
        </div>
      )
    }
    return null
  }

  const getRelativeTimeText = (date: Date) => {
    const today = new Date()
    today.setHours(0,0,0,0)
    const target = new Date(date)
    target.setHours(0,0,0,0)

    if (isToday(target)) return 'Today'
    if (isTomorrow(target)) return 'Tomorrow'
    
    const days = differenceInDays(target, today)
    if (days > 0) return `In ${days} days`
    if (days < 0) return `${Math.abs(days)} days ago`
    return format(target, 'MMM d')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <button 
          onClick={() => setFilter('3d')}
          className={`text-[12px] font-medium uppercase tracking-[0.02em] px-3 py-1.5 rounded-md transition-colors ${filter === '3d' ? 'bg-[#3B82F6] text-white' : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)]'}`}
        >
          Next 3 Days
        </button>
        <button 
          onClick={() => setFilter('7d')}
          className={`text-[12px] font-medium uppercase tracking-[0.02em] px-3 py-1.5 rounded-md transition-colors ${filter === '7d' ? 'bg-[#3B82F6] text-white' : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)]'}`}
        >
          Next 7 Days
        </button>
        <button 
          onClick={() => setFilter('month')}
          className={`text-[12px] font-medium uppercase tracking-[0.02em] px-3 py-1.5 rounded-md transition-colors ${filter === 'month' ? 'bg-[#3B82F6] text-white' : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)]'}`}
        >
          This Month
        </button>
      </div>

      <div className="space-y-3">
        {occurrences.length === 0 ? (
          <div className="p-12 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px] flex flex-col items-center justify-center">
            <Circle size={32} className="text-[rgba(255,255,255,0.1)] mb-4" />
            <h3 className="text-[15px] font-medium text-[rgba(255,255,255,0.6)] mb-1">All caught up</h3>
            <p className="text-[13px] text-[rgba(255,255,255,0.38)]">No upcoming reminders for this period.</p>
          </div>
        ) : (
          occurrences.map((occ, idx) => (
            <div key={`${occ.item.id}-${idx}`} className="p-5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-[12px] flex justify-between items-center hover:bg-[rgba(255,255,255,0.1)] transition-colors group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: occ.item.color_accent || '#3B82F6' }}
                  />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
                    {getRelativeTimeText(occ.date)}
                  </span>
                </div>
                <h3 className="font-medium text-[rgba(255,255,255,0.92)] text-[15px] leading-[1.5]">{occ.item.name}</h3>
                {renderItemDetails(occ)}
              </div>
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {occ.item.category === 'task' && occ.status !== 'completed-past' && (
                  <button 
                    onClick={() => onMarkDone(occ.item.id, format(occ.date, 'yyyy-MM-dd'))} 
                    className="text-[rgba(255,255,255,0.38)] hover:text-[#34D399] transition-colors"
                    title="Mark Done"
                  >
                    <Circle size={20} />
                  </button>
                )}
                {occ.status === 'completed-past' && (
                  <CheckCircle2 size={20} className="text-[#34D399]" />
                )}
                {occ.status !== 'completed-past' && (
                  <button
                    onClick={() => handleSnooze(occ.item.id, format(occ.date, 'yyyy-MM-dd'))}
                    disabled={snoozing === `${occ.item.id}-${format(occ.date, 'yyyy-MM-dd')}`}
                    className="text-[rgba(255,255,255,0.38)] hover:text-[#F59E0B] transition-colors disabled:opacity-30"
                    title="Snooze 1 hour"
                  >
                    <BellRing size={20} />
                  </button>
                )}
                <Link
                  href={getEditHref(occ.item)}
                  className="text-[rgba(255,255,255,0.38)] hover:text-white transition-colors"
                  title="Edit"
                >
                  <Edit2 size={20} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
