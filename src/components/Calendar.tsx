'use client'

import React from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays,
} from 'date-fns'
import { ReminderOccurrence } from '@/utils/computed-fields'
import { cn } from '@/lib/cn'

export type CalendarView = 'month' | 'week' | 'agenda'

interface CalendarProps {
  currentDate: Date
  occurrences: ReminderOccurrence[]
  selectedDate?: Date
  onSelectDate: (date: Date) => void
  onMonthChange: (date: Date) => void
  view?: CalendarView
  onViewChange?: (view: CalendarView) => void
}

function DayDots({ dayOccurrences }: { dayOccurrences: ReminderOccurrence[] }) {
  return (
    <div className="absolute bottom-1 w-full flex justify-center gap-0.5 flex-wrap px-1">
      {dayOccurrences.slice(0, 3).map((occ, idx) => {
        const color = occ.item.color_accent || 'var(--accent-500)'
        if (occ.status === 'completed-past') {
          return (
            <div key={idx} className="w-1.5 h-1.5 rounded-sm bg-[var(--state-success)] opacity-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-1 h-1 text-white"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          )
        }
        if (occ.status === 'missed-past') {
          return <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[var(--state-warning)] opacity-50" />
        }
        return <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      })}
      {dayOccurrences.length > 3 && (
        <div className="text-[8px] leading-none opacity-60">+{dayOccurrences.length - 3}</div>
      )}
    </div>
  )
}

function ViewToggle({ view, onViewChange }: { view: CalendarView; onViewChange?: (v: CalendarView) => void }) {
  if (!onViewChange) return null
  return (
    <div className="flex gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-full p-1">
      {(['month', 'week', 'agenda'] as CalendarView[]).map(v => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 capitalize cursor-pointer',
            view === v ? 'bg-[#3B82F6] text-white shadow-sm border-t border-[rgba(255,255,255,0.2)]' : 'text-[rgba(255,255,255,0.5)] hover:text-white'
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function Calendar({
  currentDate,
  occurrences,
  selectedDate,
  onSelectDate,
  onMonthChange,
  view = 'month',
  onViewChange,
}: CalendarProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const weekStart = startOfWeek(currentDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  const agendaDays = eachDayOfInterval({ start: currentDate, end: addDays(currentDate, 13) })
    .filter(day => occurrences.some(occ => isSameDay(occ.date, day)))

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    onMonthChange(d)
  }

  const headerLabel = view === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy')

  return (
    <div 
      className="rm-surface rounded-[28px] p-6"
      style={{
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
      }}
    >
      <div className="flex items-center justify-between mb-6 gap-2">
        <h2 className="text-[14px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.85)]">{headerLabel}</h2>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onViewChange={onViewChange} />
          <button 
            onClick={() => navigate(-1)} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.8)] transition-all cursor-pointer active:scale-90"
          >
            &lt;
          </button>
          <button 
            onClick={() => navigate(1)} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.8)] transition-all cursor-pointer active:scale-90"
          >
            &gt;
          </button>
        </div>
      </div>

      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-3">
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
                  className={cn(
                    'aspect-square relative flex flex-col items-center justify-start pt-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer',
                    isCurrentMonth ? 'text-[rgba(255,255,255,0.92)]' : 'text-[rgba(255,255,255,0.25)]',
                    isTodayDate && 'bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border border-[#3b82f6]/40',
                    !isTodayDate && 'hover:bg-[rgba(255,255,255,0.06)] border border-transparent',
                    isSelected && !isTodayDate && 'bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.15)]'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  <DayDots dayOccurrences={dayOccurrences} />
                </button>
              )
            })}
          </div>
        </>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const dayOccurrences = occurrences.filter(occ => isSameDay(occ.date, day))
            const isTodayDate = isToday(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            return (
              <button
                key={i}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'min-h-[80px] relative flex flex-col items-center pt-2 pb-6 rounded-xl text-[12px] font-bold transition-all cursor-pointer',
                  isTodayDate && 'bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border border-[#3b82f6]/40',
                  !isTodayDate && 'hover:bg-[rgba(255,255,255,0.06)] border border-transparent',
                  isSelected && !isTodayDate && 'bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.15)]'
                )}
              >
                <span className="text-[9px] uppercase tracking-wider font-mono text-[rgba(255,255,255,0.45)]">{format(day, 'EEE')}</span>
                <span className="mt-1">{format(day, 'd')}</span>
                <DayDots dayOccurrences={dayOccurrences} />
              </button>
            )
          })}
        </div>
      )}

      {view === 'agenda' && (
        <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar">
          {agendaDays.length === 0 ? (
            <p className="text-[12px] text-[rgba(255,255,255,0.38)] text-center py-8">No events in the next 2 weeks.</p>
          ) : (
            agendaDays.map(day => {
              const dayOccurrences = occurrences.filter(occ => isSameDay(occ.date, day))
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className="w-full text-left p-3.5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] transition-all cursor-pointer"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.45)] mb-2">
                    {isToday(day) ? 'Today' : format(day, 'EEE, MMM d')}
                  </div>
                  {dayOccurrences.map((occ, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: occ.item.color_accent || '#3B82F6' }} />
                      <span className="text-[12px] text-[rgba(255,255,255,0.85)] truncate">{occ.item.name}</span>
                    </div>
                  ))}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
