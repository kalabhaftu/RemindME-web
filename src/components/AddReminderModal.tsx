'use client'

import { useState, useEffect } from 'react'
import { createReminder } from '@/app/actions/reminders'
import { X, Calendar as CalendarIcon, User, RefreshCw, CheckSquare, Gift } from 'lucide-react'

export function AddReminderModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [category, setCategory] = useState<'person' | 'subscription' | 'task' | 'custom_holiday'>('task')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  // Person
  const [birthdate, setBirthdate] = useState('')
  const [relationship, setRelationship] = useState('friend')
  const [gender, setGender] = useState('unspecified')
  
  // Sub
  const [billingAmount, setBillingAmount] = useState('')
  const [billingCurrency, setBillingCurrency] = useState('USD')
  const [renewalDate, setRenewalDate] = useState('')
  const [cycle, setCycle] = useState('monthly')
  
  // Task
  const [dueAt, setDueAt] = useState('')

  const [overridePrefs, setOverridePrefs] = useState(false)
  const [prefsMatrix, setPrefsMatrix] = useState<Record<string, {enabled: boolean, lead_time: string, custom_time?: string}>>({
    email: { enabled: true, lead_time: 'at_time' },
    push: { enabled: true, lead_time: 'at_time' },
    telegram: { enabled: false, lead_time: 'at_time' },
    in_app: { enabled: true, lead_time: 'at_time' }
  })

  // Load defaults on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedChannels = localStorage.getItem('defaultChannels')
      const storedLead = localStorage.getItem('defaultLeadTime')
      const storedCustom = localStorage.getItem('defaultCustomTime');
      if (storedChannels && storedLead) {
        const channels = JSON.parse(storedChannels)
        setPrefsMatrix({
          email: { enabled: channels.email, lead_time: storedLead, custom_time: storedCustom || '09:00' },
          push: { enabled: channels.push, lead_time: storedLead, custom_time: storedCustom || '09:00' },
          telegram: { enabled: channels.telegram, lead_time: storedLead, custom_time: storedCustom || '09:00' },
          in_app: { enabled: channels.in_app, lead_time: storedLead, custom_time: storedCustom || '09:00' }
        })
      }
    }
  }, [])

  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        name,
        category,
        notes,
        recurrence_rules: {
          frequency: category === 'subscription' ? cycle : (category === 'person' ? 'yearly' : 'none'),
          ends: 'never'
        },
        notification_preferences: Object.keys(prefsMatrix)
          .filter(channel => prefsMatrix[channel].enabled)
          .map(channel => ({
            channel,
            enabled: true,
            lead_time: prefsMatrix[channel].lead_time,
            ...(prefsMatrix[channel].lead_time === 'custom' && prefsMatrix[channel].custom_time
              ? { custom_time: prefsMatrix[channel].custom_time }
              : {})
          }))
      }

      if (category === 'person') {
        payload.person_details = {
          birthdate,
          relationship,
          gender
        }
      } else if (category === 'subscription') {
        payload.subscription_details = {
          billing_amount: billingAmount ? parseFloat(billingAmount) : undefined,
          billing_currency: billingCurrency,
          renewal_date: renewalDate,
          cycle
        }
      } else if (category === 'task') {
        payload.task_details = {
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined
        }
      }

      await createReminder(payload)
      onClose()
      setName('')
      setNotes('')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c14]/55 backdrop-blur-[18px]">
      <div className="bg-[rgba(255,255,255,0.06)] w-full max-w-md rounded-[20px] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-[rgba(255,255,255,0.92)]">New Reminder</h2>
          <button onClick={onClose} className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 p-1 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.08)]">
            {[
              { id: 'task', icon: CheckSquare, label: 'Task' },
              { id: 'person', icon: User, label: 'Person' },
              { id: 'subscription', icon: RefreshCw, label: 'Sub' },
              { id: 'custom_holiday', icon: Gift, label: 'Event' }
            ].map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id as any)}
                className={`flex-1 flex flex-col items-center py-2 rounded-[8px] text-[12px] font-medium transition-all uppercase tracking-[0.02em] ${
                  category === c.id 
                    ? 'bg-[#3B82F6] text-white' 
                    : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.92)]'
                }`}
              >
                <c.icon size={16} className="mb-1" />
                {c.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] placeholder-[rgba(255,255,255,0.38)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
              placeholder="e.g., Mom's Birthday, Netflix Bill..."
            />
          </div>

          {category === 'person' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Birthdate</label>
                <input
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
                />
              </div>
            </div>
          )}

          {category === 'subscription' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Renewal Date</label>
                <input
                  type="date"
                  required
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={billingAmount}
                    onChange={(e) => setBillingAmount(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Cycle</label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {category === 'task' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Due Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input 
                type="checkbox" 
                checked={overridePrefs} 
                onChange={(e) => setOverridePrefs(e.target.checked)} 
                className="rounded bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              <span className="text-sm font-medium text-[rgba(255,255,255,0.92)]">Override default notification settings</span>
            </label>
            
            {overridePrefs && (
              <div className="space-y-4 bg-[rgba(0,0,0,0.2)] p-4 rounded-lg">
                <div className="grid grid-cols-[1fr_2fr] gap-4 text-xs uppercase text-[rgba(255,255,255,0.6)] font-medium mb-2">
                  <div>Channel</div>
                  <div>Timing</div>
                </div>
                {['email', 'push', 'telegram', 'in_app'].map(channel => (
                  <div key={channel} className="grid grid-cols-[1fr_2fr] gap-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefsMatrix[channel].enabled}
                        onChange={(e) => setPrefsMatrix({
                          ...prefsMatrix, 
                          [channel]: { ...prefsMatrix[channel], enabled: e.target.checked }
                        })}
                        className="rounded bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#3B82F6] focus:ring-[#3B82F6]"
                      />
                      <span className="text-sm capitalize text-[rgba(255,255,255,0.92)]">{channel.replace('_', '-')}</span>
                    </label>
                    <select
                      disabled={!prefsMatrix[channel].enabled}
                      value={prefsMatrix[channel].lead_time}
                      onChange={(e) => setPrefsMatrix({
                        ...prefsMatrix, 
                        [channel]: { ...prefsMatrix[channel], lead_time: e.target.value }
                      })}
                      className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all appearance-none disabled:opacity-30"
                    >
                      <option value="at_time">At time of event</option>
                      <option value="morning_of">Morning of</option>
                      <option value="noon_of">Noon of</option>
                      <option value="evening_of">Evening of</option>
                      <option value="custom">Custom Time</option>
                    </select>
                    {prefsMatrix[channel].enabled && prefsMatrix[channel].lead_time === 'custom' && (
                      <input
                        type="time"
                        value={prefsMatrix[channel].custom_time || '09:00'}
                        onChange={(e) => setPrefsMatrix({
                          ...prefsMatrix,
                          [channel]: { ...prefsMatrix[channel], custom_time: e.target.value }
                        })}
                        className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-sm text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-medium py-4 rounded-[8px] transition-colors flex justify-center items-center gap-2"
          >
            {loading ? 'Adding...' : 'Add Reminder'}
          </button>
        </form>
      </div>
    </div>
  )
}
