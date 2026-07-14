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
  filter: '3d' | '7d' | 'month' | 'all'
  setFilter: (f: '3d' | '7d' | 'month' | 'all') => void
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
    if (item.category === 'person' && item.person_details) {
      const p = item.person_details
      if (!p.birthdate) return null
      // We calculate age at the occurrence date
      const age = new Date(occ.date).getFullYear() - new Date(p.birthdate).getFullYear()
      return (
        <div className="flex gap-4 mt-2 text-[12px] font-mono text-[rgba(255,255,255,0.6)]">
          <span>Turns {age}</span>
        </div>
      )
    }
    
    if (item.category === 'subscription' && item.subscription_details) {
      const s = item.subscription_details
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
      <div className="flex gap-2 p-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-full max-w-max flex-wrap">
        {[
          { key: '3d', label: '3 Days' },
          { key: '7d', label: '7 Days' },
          { key: 'month', label: 'Month' },
          { key: 'all', label: 'All' },
        ].map(opt => (
          <button 
            key={opt.key}
            onClick={() => setFilter(opt.key as '3d' | '7d' | 'month' | 'all')}
            className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 cursor-pointer ${
              filter === opt.key 
                ? 'bg-[#3B82F6] text-white shadow-sm border-t border-[rgba(255,255,255,0.25)]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {occurrences.length === 0 ? (
          <div 
            className="p-12 text-center bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] backdrop-blur-[20px] flex flex-col items-center justify-center"
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)'
            }}
          >
            <Circle size={32} className="text-[rgba(255,255,255,0.15)] mb-4" />
            <h3 className="text-[14px] font-bold text-[rgba(255,255,255,0.6)] mb-1">All Caught Up</h3>
            <p className="text-[12px] text-[rgba(255,255,255,0.38)]">No upcoming reminders for this period.</p>
          </div>
        ) : (
          occurrences.map((occ, idx) => (
            <div 
              key={`${occ.item.id}-${idx}`} 
              className="p-5 bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[24px] backdrop-blur-[20px] flex justify-between items-center hover:bg-[rgba(255,255,255,0.08)] transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
              style={{
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: occ.item.color_accent || '#3B82F6' }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.45)] font-mono">
                    {getRelativeTimeText(occ.date)}
                  </span>
                </div>
                <h3 className="font-bold text-white text-[15px] leading-[1.5]">{occ.item.name}</h3>
                {renderItemDetails(occ)}
              </div>
              
              <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {occ.item.category === 'task' && occ.status !== 'completed-past' && (
                  <button 
                    onClick={() => onMarkDone(occ.item.id, format(occ.date, 'yyyy-MM-dd'))} 
                    className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 text-[rgba(255,255,255,0.6)] flex items-center justify-center transition-all cursor-pointer"
                    title="Mark Done"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {occ.status === 'completed-past' && (
                  <CheckCircle2 size={20} className="text-[#34D399] mx-1.5" />
                )}
                {occ.status !== 'completed-past' && (
                  <button
                    onClick={() => handleSnooze(occ.item.id, format(occ.date, 'yyyy-MM-dd'))}
                    disabled={snoozing === `${occ.item.id}-${format(occ.date, 'yyyy-MM-dd')}`}
                    className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30 text-[rgba(255,255,255,0.6)] flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                    title="Snooze 1 hour"
                  >
                    <BellRing size={16} />
                  </button>
                )}
                <Link
                  href={getEditHref(occ.item)}
                  className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] flex items-center justify-center transition-all"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
