'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Search as SearchIcon, User, RefreshCw, CheckSquare, Gift } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

type SearchResult = {
  id: string
  name: string
  category: string
  notes: string | null
  created_at: string
  person_details?: { birthdate: string; relationship: string }[]
  subscription_details?: { logo_url: string | null; billing_amount: number | null; cycle: string | null }[]
  task_details?: { due_at: string }[]
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const supabase = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.current.auth.getUser()
      if (!user) return

      const { data } = await supabase.current
        .from('reminder_items')
        .select('*, person_details(*), subscription_details(*), task_details(*)')
        .eq('user_id', user.id)
        .or(`name.ilike.%${q}%,notes.ilike.%${q}%`)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (data) setResults(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 200)
  }

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'person': return <User size={14} />
      case 'subscription': return <RefreshCw size={14} />
      case 'task': return <CheckSquare size={14} />
      case 'custom_holiday': return <Gift size={14} />
      default: return null
    }
  }

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'person': return 'text-[#3B82F6]'
      case 'subscription': return 'text-[#34D399]'
      case 'task': return 'text-[#F59E0B]'
      case 'custom_holiday': return 'text-[#8B5CF6]'
      default: return 'text-[rgba(255,255,255,0.38)]'
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6 lg:p-12 font-sans">
      <header className="max-w-2xl mx-auto flex items-center gap-4 mb-8">
        <Link href="/" className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors shrink-0">
          <ArrowLeft size={24} />
        </Link>
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.38)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search reminders, notes, people..."
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] pl-10 pr-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto space-y-2">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3B82F6]" />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[rgba(255,255,255,0.38)] text-sm">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {results.map((item) => (
          <div key={item.id} className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <div className="flex items-center gap-3">
              <span className={categoryColor(item.category)}>{categoryIcon(item.category)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[rgba(255,255,255,0.92)] truncate">{item.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">{item.category}</span>
                </div>
                {item.notes && (
                  <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5 truncate">{item.notes}</p>
                )}
              </div>
              <time className="text-[11px] text-[rgba(255,255,255,0.3)] font-mono shrink-0">
                {format(new Date(item.created_at), 'MMM d')}
              </time>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
