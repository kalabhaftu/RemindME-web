'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, CreditCard, CheckSquare, Gift } from 'lucide-react'
import { generateOccurrences } from '@/utils/computed-fields'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'
import { Calendar, CalendarView } from '@/components/Calendar'
import { UpcomingPanel } from '@/components/UpcomingPanel'
import { SelectedDayPanel } from '@/components/SelectedDayPanel'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { AppShell } from '@/components/AppShell'

const QUICK_ADD = [
  { href: '/people/new', label: 'Person', icon: Users },
  { href: '/subscriptions/new', label: 'Subscription', icon: CreditCard },
  { href: '/tasks/new', label: 'Task', icon: CheckSquare },
  { href: '/holidays', label: 'Holiday', icon: Gift },
]

export default function DashboardClient({ initialReminders }: { initialReminders: ReminderItemWithDetails[] }) {
  const [reminders, setReminders] = useState<ReminderItemWithDetails[]>(initialReminders)
  const [filter, setFilter] = useState<'3d' | '7d' | 'month' | 'all'>('7d')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()

  useEffect(() => { setReminders(initialReminders) }, [initialReminders])

  useEffect(() => {
    const channel = supabase
      .channel('public:reminder_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminder_items' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'person_details' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_details' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_details' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holiday_details' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalation_state' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, router])

  const markDone = async (id: string, occurrenceDate: string) => {
    const { error } = await supabase.from('escalation_state').upsert({
      reminder_item_id: id,
      occurrence_date: occurrenceDate,
      marked_done_at: new Date().toISOString()
    }, { onConflict: 'reminder_item_id, occurrence_date' })
    if (error) showToast('Error marking done: ' + error.message, 'error')
    else showToast('Marked as done', 'success')
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const calendarOccurrences = useMemo(() => {
    const cStart = startOfWeek(startOfMonth(calendarMonth))
    const cEnd = endOfWeek(endOfMonth(calendarMonth))
    return generateOccurrences(reminders, cStart, cEnd)
  }, [reminders, calendarMonth])

  const upcomingOccurrences = useMemo(() => {
    const today = new Date()
    today.setHours(0,0,0,0)
    
    let end: Date;
    if (filter === '3d') {
      end = addDays(today, 3)
    } else if (filter === '7d') {
      end = addDays(today, 7)
    } else if (filter === 'month') {
      end = endOfMonth(today)
    } else {
      end = addDays(today, 365) // all
    }
    end.setHours(23,59,59,999)

    const occs = generateOccurrences(reminders, today, end)
    return occs.filter(o => o.status === 'today' || o.status === 'upcoming' || o.status === 'completed-past' || o.status === 'missed-past')
  }, [reminders, filter])

  const selectedDayOccurrences = useMemo(() => {
    if (!selectedDate) return []
    const start = new Date(selectedDate)
    start.setHours(0,0,0,0)
    const end = new Date(selectedDate)
    end.setHours(23,59,59,999)
    return generateOccurrences(reminders, start, end)
  }, [reminders, selectedDate])

  const stats = useMemo(() => ({
    people: reminders.filter(r => r.category === 'person').length,
    subs: reminders.filter(r => r.category === 'subscription').length,
    tasks: reminders.filter(r => r.category === 'task').length,
  }), [reminders])

  return (
    <AppShell>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { href: '/people', label: 'People', count: stats.people },
          { href: '/subscriptions', label: 'Subscriptions', count: stats.subs },
          { href: '/tasks', label: 'Tasks', count: stats.tasks },
        ].map(s => (
          <Link key={s.href} href={s.href}
            className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <div className="text-[24px] font-semibold font-mono text-[#3B82F6]">{s.count}</div>
            <div className="text-[13px] text-[rgba(255,255,255,0.6)] mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-8">
        {QUICK_ADD.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-2.5 px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[10px] text-[13px] font-medium text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition-colors">
            <Icon size={15} className="text-[#3B82F6] shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <UpcomingPanel
            filter={filter}
            setFilter={setFilter}
            occurrences={upcomingOccurrences}
            onMarkDone={markDone}
            onSnoozed={() => router.refresh()}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="sticky top-28">
            <Calendar
              currentDate={calendarMonth}
              onMonthChange={setCalendarMonth}
              occurrences={calendarOccurrences}
              selectedDate={selectedDate}
              view={calendarView}
              onViewChange={setCalendarView}
              onSelectDate={(date) => {
                if (selectedDate && isSameDay(selectedDate, date)) setSelectedDate(undefined)
                else setSelectedDate(date)
              }}
            />
            {selectedDate && (
              <SelectedDayPanel
                date={selectedDate}
                occurrences={selectedDayOccurrences}
                onClose={() => setSelectedDate(undefined)}
                onMarkDone={markDone}
              />
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-[#34D399]/10 border border-[#34D399]/20 text-[#34D399]'
        }`}>
          {toast.message}
        </div>
      )}
    </AppShell>
  )
}
