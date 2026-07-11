'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckSquare, Circle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import * as Phosphor from '@phosphor-icons/react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  trash: Phosphor.Trash,
  drop: Phosphor.Drop,
  barbell: Phosphor.Barbell,
  book: Phosphor.BookOpen,
  car: Phosphor.Car,
  pill: Phosphor.Pill,
  broom: Phosphor.Broom,
  money: Phosphor.Money,
  bed: Phosphor.Bed,
  coffee: Phosphor.Coffee,
}

export function TasksTable({
  items,
  onMarkDone,
}: {
  items: ReminderItemWithDetails[]
  onMarkDone?: (id: string, date: string) => void
}) {
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    return items
      .filter(i => i.category === 'task')
      .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const da = a.task_details?.[0]?.due_at
        const db = b.task_details?.[0]?.due_at
        if (!da || !db) return 0
        return new Date(da).getTime() - new Date(db).getTime()
      })
  }, [items, search])

  if (items.filter(i => i.category === 'task').length === 0) {
    return (
      <div className="p-16 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
        <CheckSquare size={40} className="mx-auto text-[rgba(255,255,255,0.1)] mb-4" />
        <h3 className="text-[15px] font-medium text-[rgba(255,255,255,0.6)] mb-2">No tasks yet</h3>
        <Link href="/tasks/new" className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-5 py-2.5 rounded-[8px] text-sm font-medium transition-colors">
          Add task
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
        className="w-full max-w-sm px-4 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] text-sm focus:outline-none focus:border-[#3B82F6]/60" />

      <div className="space-y-2">
        {rows.map(item => {
          const t = item.task_details?.[0]
          const Icon = item.icon_key ? ICON_MAP[item.icon_key] : CheckSquare
          const dueStr = t?.due_at ? format(parseISO(t.due_at), 'MMM d, yyyy h:mm a') : 'No due date'
          const freq = item.recurrence_rules?.[0]?.frequency
          return (
            <div key={item.id} className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] flex items-center gap-4 hover:bg-[rgba(255,255,255,0.06)] transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-[rgba(59,130,246,0.15)] flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#3B82F6]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{item.name}</div>
                <div className="text-[12px] font-mono text-[rgba(255,255,255,0.45)] mt-0.5">{dueStr}{freq && freq !== 'none' ? ` · ${freq}` : ''}</div>
              </div>
              {onMarkDone && t?.due_at && (
                <button
                  onClick={() => onMarkDone(item.id, format(parseISO(t.due_at!), 'yyyy-MM-dd'))}
                  className="opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.38)] hover:text-[#34D399] transition-all"
                  title="Mark done"
                >
                  <Circle size={20} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const TASK_ICONS = [
  { key: 'trash', label: 'Trash', Icon: Phosphor.Trash },
  { key: 'drop', label: 'Water', Icon: Phosphor.Drop },
  { key: 'barbell', label: 'Exercise', Icon: Phosphor.Barbell },
  { key: 'book', label: 'Study', Icon: Phosphor.BookOpen },
  { key: 'car', label: 'Car', Icon: Phosphor.Car },
  { key: 'pill', label: 'Medicine', Icon: Phosphor.Pill },
  { key: 'broom', label: 'Clean', Icon: Phosphor.Broom },
  { key: 'money', label: 'Bills', Icon: Phosphor.Money },
  { key: 'bed', label: 'Sleep', Icon: Phosphor.Bed },
  { key: 'coffee', label: 'Break', Icon: Phosphor.Coffee },
] as const
