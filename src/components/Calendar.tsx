'use client'

import React from 'react'
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, isToday 
} from 'date-fns'
import { ReminderOccurrence } from '@/utils/computed-fields'
import { CheckSquare, AlertCircle } from 'lucide-react'

interface CalendarProps {
  currentDate: Date
  occurrences: ReminderOccurrence[]
  selectedDate?: Date
  onSelectDate: (date: Date) => void
  onMonthChange: (date: Date) => void
}

export function Calendar({ currentDate, occurrences, selectedDate, onSelectDate, onMonthChange }: CalendarProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[15px] font-medium text-[rgba(255,255,255,0.92)] flex items-center gap-2">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() - 1)
              onMonthChange(newDate)
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)]"
          >
            &lt;
          </button>
          <button 
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() + 1)
              onMonthChange(newDate)
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)]"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[12px] font-mono text-[rgba(255,255,255,0.6)] mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, i) => {
          const dayOccurrences = occurrences.filter(occ => isSameDay(occ.date, day))
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isTodayDate = isToday(day)
          const isSelected = selectedDate && isSameDay(day, selectedDate)

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={`aspect-square relative flex flex-col items-center justify-start pt-2 rounded-xl text-[13px] font-medium transition-colors
                ${isCurrentMonth ? 'text-[rgba(255,255,255,0.92)]' : 'text-[rgba(255,255,255,0.3)]'}
                ${isTodayDate ? 'shadow-[0_0_0_2px_#3B82F6]' : 'hover:bg-[rgba(255,255,255,0.06)]'}
                ${isSelected && !isTodayDate ? 'bg-[rgba(255,255,255,0.1)]' : ''}
              `}
            >
              <span>{format(day, 'd')}</span>
              
              <div className="absolute bottom-1 w-full flex justify-center gap-0.5 flex-wrap px-1">
                {dayOccurrences.slice(0, 3).map((occ, idx) => {
                  const color = occ.item.color_accent || 'var(--accent-500)'
                  if (occ.status === 'completed-past') {
                    return (
                      <div key={idx} className="w-1.5 h-1.5 rounded-sm bg-[var(--state-success)] opacity-50 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-1 h-1 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )
                  }
                  if (occ.status === 'missed-past') {
                    return <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[var(--state-warning)] opacity-50" />
                  }
                  return (
                    <div 
                      key={idx} 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )
                })}
                {dayOccurrences.length > 3 && (
                  <div className="text-[8px] leading-none opacity-60">+{dayOccurrences.length - 3}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
