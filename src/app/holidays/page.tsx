'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { format, parseISO } from 'date-fns'
import { Gift, Check } from 'lucide-react'
import { AppShell, AddButton } from '@/components/AppShell'
import { createReminder, deleteReminder } from '@/app/actions/reminders'
import { useRouter } from 'next/navigation'

type NagerHoliday = {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  types: string[]
}

type Country = { countryCode: string; name: string }

type SubscribedHoliday = {
  id: string
  name: string
  holiday_key: string
  country_code: string
  holiday_date: string
}

function holidayKey(h: NagerHoliday) {
  return `${h.countryCode}-${h.date}-${h.name}`
}

export default function HolidaysPage() {
  const router = useRouter()
  const [countries, setCountries] = useState<Country[]>([])
  const [country, setCountry] = useState('US')
  const [holidays, setHolidays] = useState<NagerHoliday[]>([])
  const [subscribed, setSubscribed] = useState<SubscribedHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHolidays, setLoadingHolidays] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const loadSubscribed = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('reminder_items')
      .select('id, name, holiday_details(country_code, holiday_key, holiday_date)')
      .eq('user_id', user.id)
      .eq('category', 'custom_holiday')

    if (data) {
      setSubscribed(
        (data as any[])
          .map(r => {
            const hd = Array.isArray(r.holiday_details) ? r.holiday_details[0] : r.holiday_details
            return {
              id: r.id,
              name: r.name,
              holiday_key: hd?.holiday_key,
              country_code: hd?.country_code,
              holiday_date: hd?.holiday_date,
            }
          })
          .filter(r => r.holiday_key && r.country_code)
      )
    }
    setLoading(false)
  }, [supabase])

  const loadHolidays = useCallback(async (code: string) => {
    setLoadingHolidays(true)
    try {
      const year = new Date().getFullYear()
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`)
      if (res.ok) {
        const data = await res.json()
        setHolidays(data)
      }
    } catch { /* silent */ }
    finally { setLoadingHolidays(false) }
  }, [])

  useEffect(() => {
    fetch('https://date.nager.at/api/v3/AvailableCountries')
      .then(r => r.json())
      .then((data: Country[]) => {
        setCountries(data.sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => {})
    loadSubscribed()
  }, [loadSubscribed])

  useEffect(() => {
    if (country) loadHolidays(country)
  }, [country, loadHolidays])

  const isSubscribed = (key: string) => subscribed.some(s => s.holiday_key === key)

  const toggleHoliday = async (h: NagerHoliday) => {
    const key = holidayKey(h)
    setToggling(key)
    try {
      if (isSubscribed(key)) {
        const sub = subscribed.find(s => s.holiday_key === key)
        if (sub) {
          await deleteReminder(sub.id)
          setSubscribed(prev => prev.filter(s => s.holiday_key !== key))
        }
      } else {
        await createReminder({
          name: h.localName || h.name,
          category: 'custom_holiday',
          holiday_details: {
            country_code: h.countryCode,
            holiday_key: key,
            holiday_date: h.date,
            is_custom: false,
          },
          recurrence_rules: { frequency: 'yearly', interval_count: 1, ends: 'never' },
          notification_preferences: [
            { channel: 'in_app', enabled: true, lead_time: 'at_time' },
            { channel: 'push', enabled: true, lead_time: 'at_time' },
          ],
        })
        await loadSubscribed()
      }
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(null)
    }
  }

  const subscribedKeys = new Set(subscribed.map(s => s.holiday_key))

  return (
    <AppShell title="Holidays" action={<AddButton href="/holidays/new" label="Custom" />}>
      {subscribed.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.45)] mb-3">
            Active reminders ({subscribed.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {subscribed.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.25)] rounded-lg text-[13px]">
                <Gift size={12} className="text-[#3B82F6]" />
                {s.name}
                <span className="text-[rgba(255,255,255,0.38)] font-mono text-[11px]">
                  {format(parseISO(s.holiday_date), 'MMM d')}
                </span>
                <button
                  onClick={async () => {
                    setToggling(s.holiday_key)
                    try {
                      await deleteReminder(s.id)
                      setSubscribed(prev => prev.filter(x => x.id !== s.id))
                      router.refresh()
                    } finally { setToggling(null) }
                  }}
                  disabled={toggling === s.holiday_key}
                  className="ml-1 text-[rgba(255,255,255,0.35)] hover:text-[#EF4444] transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Country</label>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="w-full max-w-sm bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60"
        >
          {countries.map(c => (
            <option key={c.countryCode} value={c.countryCode}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading || loadingHolidays ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(new Map(holidays.map(h => [holidayKey(h), h])).values()).map(h => {
            const key = holidayKey(h)
            const active = subscribedKeys.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleHoliday(h)}
                disabled={toggling === key}
                className={`rm-control w-full p-4 rounded-[14px] border flex items-center justify-between text-left transition-colors ${
                  active
                    ? 'bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.3)]'
                    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)]'
                }`}
              >
                <div>
                  <div className="text-[14px] font-medium">{h.localName}</div>
                  <div className="text-[12px] font-mono text-[rgba(255,255,255,0.45)] mt-0.5">
                    {format(parseISO(h.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                  active ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[rgba(255,255,255,0.2)]'
                }`}>
                  {active && <Check size={14} className="text-white" />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
