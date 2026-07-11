'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, addDays, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { generateOccurrences, ReminderOccurrence } from '@/utils/computed-fields'
import { getEditHref } from '@/lib/edit-links'
import { cn } from '@/lib/cn'

type InAppNotification = {
  id: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
  reminder_item_id: string | null
}

type Tab = 'upcoming' | 'in_app' | 'missed'

function groupOccurrences(occs: ReminderOccurrence[]) {
  const today: ReminderOccurrence[] = []
  const tomorrow: ReminderOccurrence[] = []
  const next3: ReminderOccurrence[] = []
  const next7: ReminderOccurrence[] = []
  const missed: ReminderOccurrence[] = []

  const now = startOfDay(new Date())
  const day3 = endOfDay(addDays(now, 3))
  const day7 = endOfDay(addDays(now, 7))

  for (const occ of occs) {
    if (occ.status === 'missed-past') {
      missed.push(occ)
      continue
    }
    if (occ.status !== 'today' && occ.status !== 'upcoming') continue

    if (isToday(occ.date)) today.push(occ)
    else if (isTomorrow(occ.date)) tomorrow.push(occ)
    else if (occ.date <= day3) next3.push(occ)
    else if (occ.date <= day7) next7.push(occ)
  }

  return { today, tomorrow, next3, next7, missed }
}

function OccurrenceSection({ title, items }: { title: string; items: ReminderOccurrence[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-[11px] uppercase tracking-[0.06em] font-medium text-[rgba(255,255,255,0.38)] mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((occ, i) => (
          <Link
            key={`${occ.item.id}-${i}`}
            href={getEditHref(occ.item)}
            className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <div>
              <div className="text-[14px] font-medium text-[rgba(255,255,255,0.92)]">{occ.item.name}</div>
              <div className="text-[12px] font-mono text-[rgba(255,255,255,0.45)] mt-0.5 capitalize">
                {occ.item.category.replace('_', ' ')} · {format(occ.date, 'MMM d, yyyy')}
              </div>
            </div>
            <span className={cn(
              'text-[11px] uppercase tracking-[0.04em] font-medium px-2 py-1 rounded',
              occ.status === 'today' ? 'bg-[#3B82F6]/20 text-[#5B9CFF]' : 'text-[rgba(255,255,255,0.38)]'
            )}>
              {occ.status === 'today' ? 'Today' : format(occ.date, 'EEE')}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function NotificationsClient({
  reminders,
  initialNotifications,
}: {
  reminders: ReminderItemWithDetails[]
  initialNotifications: InAppNotification[]
}) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const [notifications, setNotifications] = useState(initialNotifications)

  const occurrenceGroups = useMemo(() => {
    const start = startOfDay(new Date())
    const end = endOfDay(addDays(start, 30))
    const occs = generateOccurrences(reminders, start, end)
    return groupOccurrences(occs)
  }, [reminders])

  const unread = notifications.filter(n => !n.read_at).length

  const markAsRead = async (id: string) => {
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    }
  }

  const markAllRead = async () => {
    const res = await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    if (res.ok) {
      setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'in_app', label: 'In-app', count: unread },
    { id: 'missed', label: 'Missed', count: occurrenceGroups.missed.length },
  ]

  return (
    <AppShell title="Notifications">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-8 border-b border-[rgba(255,255,255,0.08)] pb-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium uppercase tracking-[0.02em] transition-colors',
                tab === t.id
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)]'
              )}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{t.count}</span>
              )}
            </button>
          ))}
          {tab === 'in_app' && unread > 0 && (
            <button onClick={markAllRead} className="ml-auto flex items-center gap-1.5 text-[12px] text-[#3B82F6] hover:text-[#5B9CFF]">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {tab === 'upcoming' && (
          <div>
            <OccurrenceSection title="Today" items={occurrenceGroups.today} />
            <OccurrenceSection title="Tomorrow" items={occurrenceGroups.tomorrow} />
            <OccurrenceSection title="Next 3 days" items={occurrenceGroups.next3} />
            <OccurrenceSection title="Next 7 days" items={occurrenceGroups.next7} />
            {occurrenceGroups.today.length === 0 &&
              occurrenceGroups.tomorrow.length === 0 &&
              occurrenceGroups.next3.length === 0 &&
              occurrenceGroups.next7.length === 0 && (
              <div className="p-12 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
                <Bell size={32} className="mx-auto mb-4 text-[rgba(255,255,255,0.1)]" />
                <p className="text-[rgba(255,255,255,0.38)] text-sm">Nothing coming up in the next week.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'in_app' && (
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="p-12 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
                <p className="text-[rgba(255,255,255,0.38)] text-sm">No in-app notifications yet.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && markAsRead(n.id)}
                  className={cn(
                    'p-4 rounded-[12px] border cursor-pointer transition-colors',
                    n.read_at
                      ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]'
                      : 'bg-[rgba(59,130,246,0.06)] border-[#3B82F6]/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn('text-sm truncate', n.read_at ? 'text-[rgba(255,255,255,0.6)]' : 'text-white font-medium')}>
                        {n.title}
                      </h3>
                      {n.body && <p className="text-xs text-[rgba(255,255,255,0.45)] mt-1 line-clamp-2">{n.body}</p>}
                    </div>
                    <time className="text-[11px] text-[rgba(255,255,255,0.3)] whitespace-nowrap font-mono">
                      {format(new Date(n.created_at), 'MMM d, HH:mm')}
                    </time>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'missed' && (
          <div>
            <OccurrenceSection title="Missed reminders" items={occurrenceGroups.missed} />
            {occurrenceGroups.missed.length === 0 && (
              <div className="p-12 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
                <p className="text-[rgba(255,255,255,0.38)] text-sm">No missed reminders.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
