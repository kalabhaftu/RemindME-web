'use client'

import React from 'react'
import Link from 'next/link'
import { ReminderOccurrence } from '@/utils/computed-fields'
import { getZodiacSign } from '@/utils/computed'
import { getEditHref } from '@/lib/edit-links'
import { format, isToday, isTomorrow } from 'date-fns'
import { Circle, Edit2, CheckCircle2, X } from 'lucide-react'

interface SelectedDayPanelProps {
  date: Date
  occurrences: ReminderOccurrence[]
  onClose: () => void
  onMarkDone: (id: string, date: string) => void
}

export function SelectedDayPanel({ date, occurrences, onClose, onMarkDone }: SelectedDayPanelProps) {
  const renderItemDetails = (occ: ReminderOccurrence) => {
    const item = occ.item
    if (item.category === 'person' && item.person_details) {
      const p = item.person_details
      if (!p.birthdate) return null
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
    
    if (item.category === 'subscription' && item.subscription_details) {
      const s = item.subscription_details
      return (
        <div className="flex items-center gap-4 mt-2 text-[12px] font-mono text-[rgba(255,255,255,0.6)]">
          {s.logo_url && <img src={s.logo_url} alt="" className="w-4 h-4 rounded-full" />}
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

  const isTodayDate = isToday(date)
  const isTomorrowDate = isTomorrow(date)
  const dateTitle = isTodayDate ? 'Today' : isTomorrowDate ? 'Tomorrow' : format(date, 'EEEE, MMM d, yyyy')

  return (
    <div 
      className="rm-surface-elevated rounded-[28px] p-6 sticky top-6 mt-6"
      style={{
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[14px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.85)]">
          {dateTitle}
        </h2>
        <button 
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4">
        {occurrences.length === 0 ? (
          <div 
            className="rm-surface p-8 mt-4 text-center rounded-[24px] flex flex-col items-center justify-center"
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)'
            }}
          >
            <Circle size={24} className="text-[rgba(255,255,255,0.15)] mb-3" />
            <p className="text-[12px] text-[rgba(255,255,255,0.38)]">No reminders on this day.</p>
          </div>
        ) : (
          occurrences.map((occ, idx) => (
            <div 
              key={`${occ.item.id}-${idx}`} 
              className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[20px] flex justify-between items-center hover:bg-[rgba(255,255,255,0.06)] transition-all group shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              style={{
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)'
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: occ.item.color_accent || '#3B82F6' }}
                  />
                </div>
                <h3 className="font-bold text-white text-[14px] leading-[1.5]">{occ.item.name}</h3>
                {renderItemDetails(occ)}
              </div>
              <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {occ.item.category === 'task' && occ.status !== 'completed-past' && (
                  <button 
                    onClick={() => onMarkDone(occ.item.id, format(occ.date, 'yyyy-MM-dd'))} 
                    className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 text-[rgba(255,255,255,0.6)] flex items-center justify-center transition-all cursor-pointer"
                    title="Mark Done"
                  >
                    <CheckCircle2 size={12} />
                  </button>
                )}
                {occ.status === 'completed-past' && (
                  <CheckCircle2 size={16} className="text-[#34D399] mx-1" />
                )}
                <Link
                  href={getEditHref(occ.item)}
                  className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] flex items-center justify-center transition-all"
                  title="Edit"
                >
                  <Edit2 size={12} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
