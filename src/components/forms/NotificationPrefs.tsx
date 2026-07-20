'use client'

import { useState, useEffect } from 'react'
import { CHANNELS, LEAD_TIME_OPTIONS } from '@/lib/constants'
import { CustomSelect } from './CustomSelect'
import { CustomCheckbox } from './CustomCheckbox'

export type PrefsMatrix = Record<string, {
  enabled: boolean
  lead_time: string
  custom_time?: string
  offset_days?: number
}>

const DEFAULT_MATRIX: PrefsMatrix = {
  email: { enabled: true, lead_time: 'at_time', custom_time: '09:00', offset_days: 0 },
  push: { enabled: true, lead_time: 'at_time', custom_time: '09:00', offset_days: 0 },
  telegram: { enabled: false, lead_time: 'at_time', custom_time: '09:00', offset_days: 0 },
  in_app: { enabled: true, lead_time: 'at_time', custom_time: '09:00', offset_days: 0 },
}

const PREFS_STORAGE_KEY = 'defaultPrefsMatrix'

export const OFFSET_DAY_OPTIONS = [
  { value: '0', label: 'Same day' },
  { value: '1', label: '1 day before' },
  { value: '3', label: '3 days before' },
  { value: '7', label: '1 week before' },
  { value: '14', label: '2 weeks before' },
]

export function useDefaultPrefs(): PrefsMatrix {
  const [matrix, setMatrix] = useState<PrefsMatrix>(DEFAULT_MATRIX)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedMatrix = localStorage.getItem(PREFS_STORAGE_KEY)
    if (storedMatrix) {
      try {
        const parsed = JSON.parse(storedMatrix) as Partial<PrefsMatrix>
        const merged = Object.fromEntries(
          Object.entries(DEFAULT_MATRIX).map(([channel, fallback]) => [
            channel,
            { ...fallback, ...(parsed[channel] ?? {}) },
          ])
        ) as PrefsMatrix
        setMatrix(merged)
        return
      } catch {
        localStorage.removeItem(PREFS_STORAGE_KEY)
      }
    }
    const storedChannels = localStorage.getItem('defaultChannels')
    const storedLead = localStorage.getItem('defaultLeadTime')
    const storedCustom = localStorage.getItem('defaultCustomTime')
    if (storedChannels && storedLead) {
      const channels = JSON.parse(storedChannels)
      setMatrix({
        email: { enabled: channels.email ?? false, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
        push: { enabled: channels.push ?? false, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
        telegram: { enabled: channels.telegram ?? false, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
        in_app: { enabled: channels.in_app ?? false, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
      })
    }
  }, [])

  return matrix
}

export function NotificationPrefsForm({
  matrix,
  onChange,
}: {
  matrix: PrefsMatrix
  onChange: (m: PrefsMatrix) => void
}) {
  const handleChange = (next: PrefsMatrix) => {
    onChange(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.45)] font-medium px-2">
        <div>Channel</div>
        <div>When</div>
        <div>Advance notice</div>
      </div>
      {CHANNELS.map(channel => (
        <div key={channel} className={`grid grid-cols-3 gap-4 items-start rounded-xl p-2 transition-colors ${matrix[channel]?.enabled ? 'bg-[rgba(255,255,255,0.02)]' : ''}`}>
          <div className="pt-3">
            <CustomCheckbox
              checked={matrix[channel]?.enabled ?? false}
              onChange={checked => handleChange({
                ...matrix,
                [channel]: { ...matrix[channel], enabled: checked },
              })}
              label={channel.replace('_', ' ')}
              className="capitalize"
            />
          </div>
          
          <div className="space-y-2">
            <div className={!matrix[channel]?.enabled ? 'opacity-30 pointer-events-none' : ''}>
              <CustomSelect
                value={matrix[channel]?.lead_time ?? 'at_time'}
              onChange={val => handleChange({
                ...matrix,
                [channel]: {
                  ...matrix[channel],
                  lead_time: val,
                  offset_days: val === 'at_time' || val === 'custom' ? 0 : matrix[channel].offset_days ?? 0,
                },
              })}
                options={LEAD_TIME_OPTIONS as unknown as { value: string; label: string }[]}
              />
            </div>
            
            {matrix[channel]?.enabled && matrix[channel]?.lead_time === 'custom' && (
              <div className="flex items-center bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2.5 text-sm">
                <input
                  type="time"
                  value={matrix[channel]?.custom_time || '09:00'}
                  onChange={e => handleChange({
                    ...matrix,
                    [channel]: { ...matrix[channel], custom_time: e.target.value },
                  })}
                  className="w-full bg-transparent text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}
          </div>
          
          {matrix[channel]?.lead_time !== 'at_time' && matrix[channel]?.lead_time !== 'custom' ? (
            <div className={!matrix[channel]?.enabled ? 'opacity-30 pointer-events-none' : ''}>
              <CustomSelect
                value={String(matrix[channel]?.offset_days ?? 0)}
                onChange={val => handleChange({
                  ...matrix,
                  [channel]: { ...matrix[channel], offset_days: parseInt(val, 10) },
                })}
                options={OFFSET_DAY_OPTIONS}
              />
            </div>
          ) : <div aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}

export function prefsMatrixToPayload(matrix: PrefsMatrix): {
  channel: 'email' | 'push' | 'telegram' | 'in_app'
  enabled: boolean
  lead_time: 'at_time' | 'morning_of' | 'noon_of' | 'evening_of' | 'custom'
  custom_time?: string
  offset_days?: number
}[] {
  return (Object.keys(matrix) as Array<keyof PrefsMatrix>)
    .filter(ch => matrix[ch]?.enabled)
    .map(ch => ({
      channel: ch as 'email' | 'push' | 'telegram' | 'in_app',
      enabled: true,
      lead_time: matrix[ch].lead_time as 'at_time' | 'morning_of' | 'noon_of' | 'evening_of' | 'custom',
      offset_days: matrix[ch].lead_time === 'at_time' || matrix[ch].lead_time === 'custom'
        ? 0
        : matrix[ch].offset_days ?? 0,
      ...(matrix[ch].lead_time === 'custom' && matrix[ch].custom_time
        ? { custom_time: matrix[ch].custom_time }
        : {}),
    }))
}
