'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { User, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { ReminderItemWithDetails } from '@/app/actions/reminders'
import { getAge, getDaysUntilBirthday, getZodiacSign } from '@/utils/computed'
import { TagPill } from '@/components/ui/TagPill'
import { GENDER_LABELS, RELATIONSHIP_LABELS, ZODIAC_META, SortOption } from '@/lib/constants'
import { cn } from '@/lib/cn'
import Link from 'next/link'
import { EmptyState } from '@/components/EmptyState'

type PersonRow = {
  id: string
  name: string
  birthdate: string
  gender: string
  relationship: string
  age: number
  zodiac: string
  daysToBirthday: number
  createdAt: string
}

function toPersonRows(items: ReminderItemWithDetails[]): PersonRow[] {
  return items
    .filter(i => i.category === 'person')
    .map(i => {
      const p = i.person_details?.[0]
      const birthdate = p?.birthdate
      return {
        id: i.id,
        name: i.name,
        birthdate: birthdate ?? '',
        gender: p?.gender ?? 'unspecified',
        relationship: p?.relationship ?? 'other',
        age: birthdate ? getAge(birthdate) : 0,
        zodiac: birthdate ? getZodiacSign(birthdate) : 'Unknown',
        daysToBirthday: birthdate ? getDaysUntilBirthday(birthdate) : 9999,
        createdAt: i.created_at,
      }
    })
}

function sortRows(rows: PersonRow[], sort: SortOption): PersonRow[] {
  const sorted = [...rows]
  switch (sort) {
    case 'days_asc':
      return sorted.sort((a, b) => a.daysToBirthday - b.daysToBirthday)
    case 'name_asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'age_desc':
      return sorted.sort((a, b) => b.age - a.age)
    case 'relationship':
      return sorted.sort((a, b) => a.relationship.localeCompare(b.relationship))
    case 'recent':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    default:
      return sorted
  }
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
    >
      {label}
      {active && (direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  )
}

export function PeopleTable({ items }: { items: ReminderItemWithDetails[] }) {
  const [sort, setSort] = useState<SortOption>('days_asc')
  const [search, setSearch] = useState('')
  const [filterRelationship, setFilterRelationship] = useState<string>('all')
  const [filterGender, setFilterGender] = useState<string>('all')

  const rows = useMemo(() => {
    let data = toPersonRows(items)
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(r => r.name.toLowerCase().includes(q))
    }
    if (filterRelationship !== 'all') {
      data = data.filter(r => r.relationship === filterRelationship)
    }
    if (filterGender !== 'all') {
      data = data.filter(r => r.gender === filterGender)
    }
    return sortRows(data, sort)
  }, [items, sort, search, filterRelationship, filterGender])

  const toggleSort = (option: SortOption) => {
    setSort(prev => (prev === option ? prev : option))
  }

  if (toPersonRows(items).length === 0) {
    return (
      <EmptyState
        iconPath="/icons/3d/empty_people.png"
        message="No people yet. Track birthdays, ages, and zodiac signs for everyone you care about."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.38)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-9 pr-4 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] text-sm text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60"
          />
        </div>
        <select
          value={filterRelationship}
          onChange={e => setFilterRelationship(e.target.value)}
          className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
        >
          <option value="all">All relationships</option>
          {Object.entries(RELATIONSHIP_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
        >
          <option value="all">All genders</option>
          {Object.entries(GENDER_LABELS).filter(([k]) => k !== 'unspecified').map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {([
            ['days_asc', 'Closest birthday'],
            ['name_asc', 'A–Z'],
            ['age_desc', 'Age'],
            ['relationship', 'Relationship'],
            ['recent', 'Recent'],
          ] as [SortOption, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-[0.02em] transition-colors',
                sort === key
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.06)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-[rgba(255,255,255,0.08)]">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
              <th className="px-4 py-3"><SortHeader label="Person Name" active={sort === 'name_asc'} direction="asc" onClick={() => toggleSort('name_asc')} /></th>
              <th className="px-4 py-3"><SortHeader label="Age" active={sort === 'age_desc'} direction="desc" onClick={() => toggleSort('age_desc')} /></th>
              <th className="px-4 py-3"><span className="text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Gender</span></th>
              <th className="px-4 py-3"><span className="text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Zodiac</span></th>
              <th className="px-4 py-3"><SortHeader label="Relationship" active={sort === 'relationship'} direction="asc" onClick={() => toggleSort('relationship')} /></th>
              <th className="px-4 py-3"><SortHeader label="Next birthday" active={sort === 'days_asc'} direction="asc" onClick={() => toggleSort('days_asc')} /></th>
              <th className="px-4 py-3"><span className="text-[11px] uppercase tracking-[0.04em] font-medium text-[rgba(255,255,255,0.45)]">Birthday</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const gender = GENDER_LABELS[row.gender] ?? GENDER_LABELS.unspecified
              const rel = RELATIONSHIP_LABELS[row.relationship] ?? RELATIONSHIP_LABELS.other
              const zodiac = ZODIAC_META[row.zodiac] ?? { glyph: '★', color: 'rgba(255,255,255,0.06)' }
              const ageProgress = Math.min(row.age / 100, 1) * 100

              return (
                <tr
                  key={row.id}
                  className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link href={`/people/${row.id}`} className="flex items-center gap-2.5 group-hover:text-[#5B9CFF] transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[rgba(59,130,246,0.15)] flex items-center justify-center shrink-0">
                        <User size={14} className="text-[#3B82F6]" />
                      </div>
                      <span className="text-[14px] font-medium text-[rgba(255,255,255,0.92)]">{row.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {row.birthdate ? (
                      <div className="flex items-center gap-3 min-w-[100px]">
                        <span className="font-mono text-[13px] text-[rgba(255,255,255,0.7)] w-6">{row.age}</span>
                        <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9]"
                            style={{ width: `${ageProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[rgba(255,255,255,0.45)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TagPill color={gender.color}>{gender.label}</TagPill>
                  </td>
                  <td className="px-4 py-3">
                    <TagPill color={zodiac.color}>
                      <span>{zodiac.glyph}</span>
                      <span>{row.zodiac}</span>
                    </TagPill>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-[rgba(255,255,255,0.7)]">
                      {rel.emoji} {rel.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.birthdate ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[rgba(255,255,255,0.7)]">
                        <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.08)] rounded text-[rgba(255,255,255,0.92)]">{row.daysToBirthday}</span>
                        <span className="text-[rgba(255,255,255,0.45)]">days</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-[rgba(255,255,255,0.45)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[rgba(255,255,255,0.6)]">
                    {row.birthdate ? format(parseISO(row.birthdate), 'MMMM d, yyyy') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-[rgba(255,255,255,0.38)]">{rows.length} {rows.length === 1 ? 'person' : 'people'}</p>
    </div>
  )
}
