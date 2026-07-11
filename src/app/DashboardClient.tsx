'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AddReminderModal } from '@/components/AddReminderModal'
import { Bell, Plus, Settings, BellRing, Search, Layout } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { generateOccurrences, ReminderOccurrence } from '@/utils/computed-fields'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'
import { Calendar } from '@/components/Calendar'
import { UpcomingPanel } from '@/components/UpcomingPanel'
import { SelectedDayPanel } from '@/components/SelectedDayPanel'
import { ReminderItemWithDetails } from '@/app/actions/reminders'

export default function DashboardClient({ initialReminders }: { initialReminders: ReminderItemWithDetails[] }) {
  const [reminders, setReminders] = useState<ReminderItemWithDetails[]>(initialReminders)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<'3d' | '7d' | 'month'>('month')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()

  useEffect(() => {
    setReminders(initialReminders)
  }, [initialReminders])

  useEffect(() => {
    const channel = supabase
      .channel('public:reminder_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminder_items' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalation_state' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  const markDone = async (id: string, occurrenceDate: string) => {
    const { error } = await supabase.from('escalation_state').upsert({
      reminder_item_id: id,
      occurrence_date: occurrenceDate,
      marked_done_at: new Date().toISOString()
    }, { onConflict: 'reminder_item_id, occurrence_date' })
    
    if (error) {
      showToast('Error marking done: ' + error.message, 'error')
    } else {
      showToast('Task marked as done', 'success')
      // router.refresh() will be triggered by the realtime subscription
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Generate occurrences for Calendar
  const calendarOccurrences = useMemo(() => {
    const cStart = startOfWeek(startOfMonth(calendarMonth))
    const cEnd = endOfWeek(endOfMonth(calendarMonth))
    return generateOccurrences(reminders, cStart, cEnd)
  }, [reminders, calendarMonth])

  // Generate occurrences for Upcoming Panel
  const upcomingOccurrences = useMemo(() => {
    const today = new Date()
    today.setHours(0,0,0,0)
    let days = 30
    if (filter === '3d') days = 3
    if (filter === '7d') days = 7
    
    const end = addDays(today, days)
    end.setHours(23,59,59,999)

    const occs = generateOccurrences(reminders, today, end)
    // For upcoming panel, we typically want to see 'today' and 'upcoming'
    // but we can also show things that were due today but marked done
    return occs.filter(o => o.status === 'today' || o.status === 'upcoming' || o.status === 'completed-past' || o.status === 'missed-past')
  }, [reminders, filter])

  // Generate occurrences for Selected Day
  const selectedDayOccurrences = useMemo(() => {
    if (!selectedDate) return []
    const start = new Date(selectedDate)
    start.setHours(0,0,0,0)
    const end = new Date(selectedDate)
    end.setHours(23,59,59,999)
    return generateOccurrences(reminders, start, end)
  }, [reminders, selectedDate])

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6 lg:p-12 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="w-10 h-10 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors">
            <BellRing size={20} className="text-[#3B82F6]" />
          </Link>
          <h1 className="text-[28px] font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">RemindME</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/search" className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="Search">
            <Search size={20} />
          </Link>
          <Link href="/templates" className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="Templates">
            <Layout size={20} />
          </Link>
          <Link href="/settings" className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors">
            <Settings size={20} />
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-4 py-2 rounded-[8px] font-medium transition-colors border-none"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Reminder</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upcoming Items */}
        <div className="lg:col-span-2">
          <UpcomingPanel 
            filter={filter}
            setFilter={setFilter}
            occurrences={upcomingOccurrences}
            onMarkDone={markDone}
          />
        </div>

        {/* Right Column: Calendar and Selected Day Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="sticky top-6">
            <Calendar 
              currentDate={calendarMonth}
              onMonthChange={setCalendarMonth}
              occurrences={calendarOccurrences}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                if (selectedDate && isSameDay(selectedDate, date)) {
                  setSelectedDate(undefined)
                } else {
                  setSelectedDate(date)
                }
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

      </main>

      <AddReminderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-[#34D399]/10 border border-[#34D399]/20 text-[#34D399]'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
