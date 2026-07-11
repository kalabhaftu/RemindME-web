'use client'

import { useState, useEffect } from 'react'
import { CHANNELS, LEAD_TIME_OPTIONS } from '@/lib/constants'

export type PrefsMatrix = Record<string, {
  enabled: boolean
  lead_time: string
  custom_time?: string
  offset_days?: number
}>

const DEFAULT_MATRIX: PrefsMatrix = {
  email: { enabled: true, lead_time: 'morning_of', custom_time: '09:00', offset_days: 0 },
  push: { enabled: true, lead_time: 'morning_of', custom_time: '09:00', offset_days: 0 },
  telegram: { enabled: false, lead_time: 'morning_of', custom_time: '09:00', offset_days: 0 },
  in_app: { enabled: true, lead_time: 'at_time', custom_time: '09:00', offset_days: 0 },
}

export const OFFSET_DAY_OPTIONS = [
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
] as const

export function useDefaultPrefs(): PrefsMatrix {
  const [matrix, setMatrix] = useState<PrefsMatrix>(DEFAULT_MATRIX)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedChannels = localStorage.getItem('defaultChannels')
    const storedLead = localStorage.getItem('defaultLeadTime')
    const storedCustom = localStorage.getItem('defaultCustomTime')
    if (storedChannels && storedLead) {
      const channels = JSON.parse(storedChannels)
      setMatrix({
        email: { enabled: channels.email, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
        push: { enabled: channels.push, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
        telegram: { enabled: channels.telegram, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
        in_app: { enabled: channels.in_app, lead_time: storedLead, custom_time: storedCustom || '09:00', offset_days: 0 },
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
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 text-[11px] uppercase tracking-[0.04em] text-[rgba(255,255,255,0.45)] font-medium">
        <div>Channel</div>
        <div>When</div>
        <div>Advance notice</div>
      </div>
      {CHANNELS.map(channel => (
        <div key={channel} className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-start">
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={matrix[channel]?.enabled ?? false}
              onChange={e => onChange({
                ...matrix,
                [channel]: { ...matrix[channel], enabled: e.target.checked },
              })}
              className="rounded bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#3B82F6] focus:ring-[#3B82F6]"
            />
            <span className="text-sm capitalize text-[rgba(255,255,255,0.92)]">{channel.replace('_', ' ')}</span>
          </label>
          <div>
            <select
              disabled={!matrix[channel]?.enabled}
              value={matrix[channel]?.lead_time ?? 'at_time'}
              onChange={e => onChange({
                ...matrix,
                [channel]: { ...matrix[channel], lead_time: e.target.value },
              })}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 disabled:opacity-30"
            >
              {LEAD_TIME_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {matrix[channel]?.enabled && matrix[channel]?.lead_time === 'custom' && (
              <input
                type="time"
                value={matrix[channel]?.custom_time || '09:00'}
                onChange={e => onChange({
                  ...matrix,
                  [channel]: { ...matrix[channel], custom_time: e.target.value },
                })}
                className="w-full mt-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60"
              />
            )}
          </div>
          <select
            disabled={!matrix[channel]?.enabled}
            value={matrix[channel]?.offset_days ?? 0}
            onChange={e => onChange({
              ...matrix,
              [channel]: { ...matrix[channel], offset_days: parseInt(e.target.value, 10) },
            })}
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 disabled:opacity-30 mt-2"
          >
            {OFFSET_DAY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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
      offset_days: matrix[ch].offset_days ?? 0,
      ...(matrix[ch].lead_time === 'custom' && matrix[ch].custom_time
        ? { custom_time: matrix[ch].custom_time }
        : {}),
    }))
}
