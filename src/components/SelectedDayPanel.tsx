'use client'

import React from 'react'
import { ReminderOccurrence } from '@/utils/computed-fields'
import { getZodiacSign } from '@/utils/computed'
import { format, isToday, isTomorrow } from 'date-fns'
import { Circle, BellRing, Edit2, CheckCircle2, X } from 'lucide-react'

interface SelectedDayPanelProps {
  date: Date
  occurrences: ReminderOccurrence[]
  onClose: () => void
  onMarkDone: (id: string, date: string) => void
}

export function SelectedDayPanel({ date, occurrences, onClose, onMarkDone }: SelectedDayPanelProps) {
  const renderItemDetails = (occ: ReminderOccurrence) => {
    const item = occ.item
    if (item.category === 'person' && item.person_details?.length) {
      const p = item.person_details[0]
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
    
    if (item.category === 'subscription' && item.subscription_details?.length) {
      const s = item.subscription_details[0]
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
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-6 sticky top-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[15px] font-medium text-[rgba(255,255,255,0.92)]">
          {dateTitle}
        </h2>
        <button 
          onClick={onClose}
          className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {occurrences.length === 0 ? (
          <div className="p-8 mt-4 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px] flex flex-col items-center justify-center">
            <Circle size={24} className="text-[rgba(255,255,255,0.1)] mb-3" />
            <p className="text-[13px] text-[rgba(255,255,255,0.38)]">No reminders on this day.</p>
          </div>
        ) : (
          occurrences.map((occ, idx) => (
            <div key={`${occ.item.id}-${idx}`} className="p-4 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-[12px] flex justify-between items-center hover:bg-[rgba(255,255,255,0.1)] transition-colors group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: occ.item.color_accent || '#3B82F6' }}
                  />
                </div>
                <h3 className="font-medium text-[rgba(255,255,255,0.92)] text-[14px] leading-[1.5]">{occ.item.name}</h3>
                {renderItemDetails(occ)}
              </div>
              <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {occ.item.category === 'task' && occ.status !== 'completed-past' && (
                  <button 
                    onClick={() => onMarkDone(occ.item.id, format(occ.date, 'yyyy-MM-dd'))} 
                    className="text-[rgba(255,255,255,0.38)] hover:text-[#34D399] transition-colors"
                    title="Mark Done"
                  >
                    <Circle size={18} />
                  </button>
                )}
                {occ.status === 'completed-past' && (
                  <CheckCircle2 size={18} className="text-[#34D399]" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
