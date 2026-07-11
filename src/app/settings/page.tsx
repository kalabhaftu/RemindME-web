'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Save, Send, Trash2, ShieldAlert, Mail, Bell, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [telegramToken, setTelegramToken] = useState('')
  const [hasTelegramToken, setHasTelegramToken] = useState(false)
  const [maskedTelegramToken, setMaskedTelegramToken] = useState('')
  const [botUsername, setBotUsername] = useState<string | null>(null)
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
  
  const supabaseRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
  const registeredRef = useRef(false)

  useEffect(() => {
    if (registeredRef.current) return
    registeredRef.current = true

    const supabase = supabaseRef.current

    // Register service worker + FCM
    const registerPush = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) return
      try {
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        await navigator.serviceWorker.ready

        // Unsubscribe any stale push subscription from old VAPID key
        const existingSub = await reg.pushManager.getSubscription()
        if (existingSub) {
          await existingSub.unsubscribe()
        }

        const { requestFcmToken } = await import('@/lib/firebase-client')
        const token = await requestFcmToken(reg)
        if (token) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('notification_channels').upsert({
              user_id: user.id,
              channel: 'push',
              encrypted_token: token,
            }, { onConflict: 'user_id,channel' })
          }
        }
      } catch (err) {
        console.warn('FCM registration failed:', err)
      }
    }
    registerPush()

    // Load delivery logs
    supabase.from('delivery_log').select('*').order('scheduled_for', { ascending: false }).limit(10)
      .then(({ data }) => {
        if (data) setLogs(data)
      })

    // Load telegram token status
    fetch('/api/settings/telegram')
      .then(res => res.json())
      .then(data => {
        if (data.hasToken) {
          setHasTelegramToken(true)
          setMaskedTelegramToken(data.maskedToken)
          setBotUsername(data.botUsername ?? null)
        }
      })

    // Load defaults from local storage (fallback), then from Supabase
    const storedChannels = localStorage.getItem('defaultChannels');
    if (storedChannels) setDefaultChannels(JSON.parse(storedChannels));
    const storedLeadTime = localStorage.getItem('defaultLeadTime');
    if (storedLeadTime) setDefaultLeadTime(storedLeadTime);
    const storedCustomTime = localStorage.getItem('defaultCustomTime');
    if (storedCustomTime) setDefaultCustomTime(storedCustomTime);

    // Load user settings from Supabase (overrides local storage)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
          .then(({ data }) => {
            if (data) {
              if (data.nudge_delay_hours) setNudgeDelayHours(data.nudge_delay_hours)
              if (data.default_channels) setDefaultChannels(data.default_channels)
              if (data.default_lead_time) setDefaultLeadTime(data.default_lead_time)
              if (data.default_custom_time) setDefaultCustomTime(data.default_custom_time)
            }
          })
      }
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      
      // Handle telegram token submission
      if (telegramToken && !hasTelegramToken) {
        const res = await fetch('/api/settings/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: telegramToken })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save telegram token');
        }
        const saveData = await res.json();
        setBotUsername(saveData.botUsername ?? null);
        
        // Refresh token status
        const refreshRes = await fetch('/api/settings/telegram');
        const refreshData = await refreshRes.json();
        if (refreshData.hasToken) {
          setHasTelegramToken(true);
          setMaskedTelegramToken(refreshData.maskedToken);
          setTelegramToken('');
        }
      }

      // Upsert user settings (synced globally)
      const { error: settingsError } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        nudge_delay_hours: nudgeDelayHours,
        default_channels: defaultChannels,
        default_lead_time: defaultLeadTime,
        default_custom_time: defaultCustomTime,
      })
      if (settingsError) throw settingsError
      
      // Also cache locally for offline access
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

  const deleteTelegramToken = async () => {
    if (!window.confirm('Are you sure you want to delete your Telegram token?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings/telegram', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete token');
      setHasTelegramToken(false);
      setMaskedTelegramToken('');
      setBotUsername(null);
      setTelegramToken('');
      showToast('Telegram token deleted', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const deleteAccount = async () => {
    if (window.confirm('Are you sure you want to completely delete your account? This will cascade delete all your reminders and revoke external tokens.')) {
      try {
        const res = await fetch('/api/account', { method: 'DELETE' })
        if (res.ok) {
          await supabaseRef.current.auth.signOut()
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
        <h1 className="text-2xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] flex-1">Settings</h1>
        <button
          onClick={async () => {
            await supabaseRef.current.auth.signOut()
            router.push('/login')
          }}
          className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors flex items-center gap-2 text-sm"
        >
          <LogOut size={18} /> Sign Out
        </button>
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
          
          {hasTelegramToken ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg">
                <div className="space-y-1">
                  <div className="text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)]">Saved Token</div>
                  <div className="font-mono text-sm text-[rgba(255,255,255,0.92)]">{maskedTelegramToken}</div>
                  {botUsername && (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#3B82F6] hover:underline text-sm font-medium mt-1"
                    >
                      <span>@{botUsername}</span>
                      <span className="text-[rgba(255,255,255,0.38)] text-xs">↗</span>
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={deleteTelegramToken}
                  disabled={loading}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Token"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">To update your token, delete the existing one first.</p>
            </div>
          ) : (
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
                disabled={loading || !telegramToken}
                className="bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Token'}
              </button>
            </form>
          )}
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
              <Mail size={18} /> Email
            </button>
            <button
              onClick={() => testChannel('push')}
              className="bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-white px-6 py-3 rounded-[8px] font-medium transition-colors flex items-center gap-2"
            >
              <Bell size={18} /> Push
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
