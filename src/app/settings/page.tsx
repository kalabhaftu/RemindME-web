'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Save, Send, Trash2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [telegramToken, setTelegramToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<Record<string, any>[]>([])
  const [nudgeDelayHours, setNudgeDelayHours] = useState(4)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }
  
  const [defaultChannels, setDefaultChannels] = useState<Record<string, boolean>>({
    email: true,
    push: false,
    telegram: false,
    in_app: true,
  });
  const [defaultLeadTime, setDefaultLeadTime] = useState('morning_of');
  const [defaultCustomTime, setDefaultCustomTime] = useState('09:00');
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Load delivery logs
    supabase.from('delivery_log').select('*').order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => {
        if (data) setLogs(data)
      })

    // Load defaults from local storage
    const storedChannels = localStorage.getItem('defaultChannels');
    if (storedChannels) setDefaultChannels(JSON.parse(storedChannels));
    const storedLeadTime = localStorage.getItem('defaultLeadTime');
    if (storedLeadTime) setDefaultLeadTime(storedLeadTime);
    const storedCustomTime = localStorage.getItem('defaultCustomTime');
    if (storedCustomTime) setDefaultCustomTime(storedCustomTime);

    // Load user settings
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_settings').select('nudge_delay_hours').eq('user_id', user.id).single()
          .then(({ data }) => {
            if (data) setNudgeDelayHours(data.nudge_delay_hours)
          })
      }
    })
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      
      // Upsert telegram token to notification_channels if provided
      if (telegramToken) {
        const { error } = await supabase.from('notification_channels').upsert({
          user_id: user.id,
          channel: 'telegram',
          encrypted_token: telegramToken
        }, { onConflict: 'user_id,channel' })
        
        if (error) throw error
      }

      // Upsert user settings
      const { error: settingsError } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        nudge_delay_hours: nudgeDelayHours
      })
      if (settingsError) throw settingsError
      
      // Save global defaults to local storage
      localStorage.setItem('defaultChannels', JSON.stringify(defaultChannels));
      localStorage.setItem('defaultLeadTime', defaultLeadTime);
      localStorage.setItem('defaultCustomTime', defaultCustomTime);
      
      showToast('Settings saved successfully!', 'success')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const testChannel = async (channel: string) => {
    try {
      const res = await fetch(`/api/channels/${channel}/test`, { method: 'POST' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send test notification')
      }
      showToast(`Test notification sent via ${channel}!`, 'success')
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const deleteAccount = async () => {
    if (window.confirm('Are you sure you want to completely delete your account? This will cascade delete all your reminders and revoke external tokens.')) {
      try {
        const res = await fetch('/api/account', { method: 'DELETE' })
        if (res.ok) {
          await supabase.auth.signOut()
          router.push('/login')
        } else {
          const errorData = await res.json().catch(() => ({}))
          showToast(errorData.error || 'Failed to delete account', 'error')
        }
      } catch (err) {
        showToast('Error deleting account', 'error')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6 lg:p-12 font-sans">
      <header className="max-w-2xl mx-auto flex items-center gap-4 mb-12">
        <Link href="/" className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[rgba(255,255,255,0.92)]">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto space-y-8">
        
        {/* Telegram Bot Setup */}
        <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white mb-2">Telegram Bot Setup</h2>
          <p className="text-sm text-[rgba(255,255,255,0.6)] mb-6">
            1. Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[#3B82F6] hover:underline">@BotFather</a> on Telegram.<br/>
            2. Send <code>/newbot</code> and follow the instructions to create your own bot.<br/>
            3. Copy the HTTP API Token and paste it below. You own this bot completely.
          </p>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Telegram Bot Token</label>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklmNOPqrstUVwxyZ"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all font-mono text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Token'}
            </button>
          </form>
        </section>

        {/* Global Notification Defaults */}
        <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white mb-2">Global Notification Defaults</h2>
          <p className="text-sm text-[rgba(255,255,255,0.6)] mb-6">
            These settings will be inherited by new reminders unless you override them per-item.
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-3">Default Channels</label>
              <div className="flex gap-4">
                {['email', 'push', 'telegram', 'in_app'].map(ch => (
                  <label key={ch} className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.92)] cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={defaultChannels[ch] || false}
                      onChange={(e) => setDefaultChannels({...defaultChannels, [ch]: e.target.checked})}
                      className="rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span className="capitalize">{ch.replace('_', '-')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-3">Default Timing</label>
              <select
                value={defaultLeadTime}
                onChange={(e) => setDefaultLeadTime(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all appearance-none"
              >
                <option value="at_time">At time of event</option>
                <option value="morning_of">Morning of</option>
                <option value="noon_of">Noon of</option>
                <option value="evening_of">Evening of</option>
                <option value="custom">Custom Time</option>
              </select>
              {defaultLeadTime === 'custom' && (
                <input
                  type="time"
                  value={defaultCustomTime}
                  onChange={(e) => setDefaultCustomTime(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all mt-3"
                />
              )}
            </div>

            <div>
              <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-3">Escalation Nudge Delay (Hours)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={nudgeDelayHours}
                onChange={(e) => setNudgeDelayHours(parseInt(e.target.value) || 4)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all"
              />
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-2">Time to wait before sending a follow-up nudge if a task is not marked done.</p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-[8px] font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>
        </section>

        {/* Testing & Diagnostics */}
        <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white mb-6">Test Notifications</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => testChannel('email')}
              className="bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-white px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2"
            >
              <Send size={18} /> Email
            </button>
            <button
              onClick={() => testChannel('push')}
              className="bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-white px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2"
            >
              <Send size={18} /> Push
            </button>
            <button
              onClick={() => testChannel('telegram')}
              className="bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-white px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2"
            >
              <Send size={18} /> Telegram
            </button>
          </div>
        </section>

        {/* Delivery Logs */}
        <section className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Recent Delivery Logs</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-[rgba(255,255,255,0.38)]">No logs available.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-3 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.04)]">
                  <div>
                    <span className="text-[rgba(255,255,255,0.92)] capitalize">{log.channel}</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.38)]">•</span>
                    <span className={log.status === 'sent' ? 'text-green-400' : 'text-red-400'}>{log.status}</span>
                  </div>
                  <div className="text-[rgba(255,255,255,0.38)] font-mono text-xs">
                    {new Date(log.created_at || log.scheduled_for).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-[rgba(239,68,68,0.1)] border border-red-500/20 rounded-2xl p-6 mt-12">
          <h2 className="text-lg font-medium text-red-400 mb-2 flex items-center gap-2">
            <ShieldAlert size={20} /> Danger Zone
          </h2>
          <p className="text-sm text-red-400/80 mb-6">
            Permanently delete your account, all reminders, and revoke all external tokens. This action cannot be undone.
          </p>
          <button
            onClick={deleteAccount}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete Account
          </button>
        </section>

      </main>

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
