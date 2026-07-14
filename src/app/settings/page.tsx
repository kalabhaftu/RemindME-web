'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Save, Send, Trash2, ShieldAlert, Mail, Bell, LogOut, Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { AppShell } from '@/components/AppShell'


export default function SettingsPage() {
  const router = useRouter()
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [telegramToken, setTelegramToken] = useState('')
  const [hasTelegramToken, setHasTelegramToken] = useState(false)
  const [loadingTelegram, setLoadingTelegram] = useState(true)
  const [maskedTelegramToken, setMaskedTelegramToken] = useState('')
  const [botUsername, setBotUsername] = useState<string | null>(null)
  const [hasChatId, setHasChatId] = useState(false)
  const [maskedChatId, setMaskedChatId] = useState('')
  const [chatIdInput, setChatIdInput] = useState('')
  const [detectingChatId, setDetectingChatId] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<Record<string, any>[]>([])
  const [nudgeDelayHours, setNudgeDelayHours] = useState(4)
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

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


        const { requestFcmToken } = await import('@/lib/firebase-client')
        const token = await requestFcmToken(reg)
        if (token) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { error: pushError } = await supabase.from('notification_channels').insert({
              user_id: user.id,
              channel: 'push',
              encrypted_token: token,
            })
            if (pushError && pushError.code !== '23505') {
              console.warn('Failed to save push token to DB:', pushError)
            }
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
    setLoadingTelegram(true)
    fetch('/api/settings/telegram')
      .then(res => res.json())
      .then(data => {
        if (data.hasToken) {
          setHasTelegramToken(true)
          setMaskedTelegramToken(data.maskedToken)
          setBotUsername(data.botUsername ?? null)
          setHasChatId(data.hasChatId ?? false)
          setMaskedChatId(data.maskedChatId ?? '')
        }
      })
      .finally(() => {
        setLoadingTelegram(false)
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
        setCurrentUser(user)
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
        timezone,
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

  const detectChatId = async () => {
    setDetectingChatId(true)
    try {
      const res = await fetch('/api/settings/telegram/chat-id', { method: 'PUT' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Detection failed')
      setHasChatId(true)
      setMaskedChatId(data.chatId ? `***${String(data.chatId).slice(-4)}` : '****')
      showToast('Chat ID detected and saved!', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Detection failed', 'error')
    } finally {
      setDetectingChatId(false)
    }
  }

  const saveChatId = async () => {
    if (!chatIdInput.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/settings/telegram/chat-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatIdInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setHasChatId(true)
      setMaskedChatId(`***${chatIdInput.trim().slice(-4)}`)
      setChatIdInput('')
      showToast('Chat ID saved!', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteTelegramToken = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Telegram Token?',
      message: 'Are you sure you want to delete your Telegram token?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          const res = await fetch('/api/settings/telegram', { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete token');
          setHasTelegramToken(false);
          setMaskedTelegramToken('');
          setBotUsername(null);
          setHasChatId(false);
          setMaskedChatId('');
          setTelegramToken('');
          showToast('Telegram token deleted', 'success');
        } catch (err: any) {
          showToast(err.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  }

  const deleteAccount = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Account?',
      message: 'Are you sure you want to completely delete your account? This will cascade delete all your reminders and revoke external tokens.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
    });
  }

  const exportData = async () => {
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `remindme-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Data exported successfully', 'success')
    } catch {
      showToast('Failed to export data', 'error')
    }
  }

  const logoutAllDevices = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sign Out All Devices?',
      message: 'Sign out on all devices? You will need to log in again everywhere.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const { error } = await supabaseRef.current.auth.signOut({ scope: 'global' })
        if (error) showToast(error.message, 'error')
        else {
          router.refresh()
          window.location.href = '/login'
        }
      }
    });
  }

  return (
    <AppShell title="Settings">
      <main className="max-w-2xl mx-auto space-y-8">
        
        {/* Telegram Bot Setup */}
        <section 
          className="bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] p-6 backdrop-blur-[20px]"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-2">Telegram Bot Setup</h2>
          <p className="text-xs text-[rgba(255,255,255,0.5)] mb-6 leading-relaxed">
            1. Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[#3B82F6] hover:underline font-bold">@BotFather</a> on Telegram.<br/>
            2. Send <code>/newbot</code> and follow the instructions to create your own bot.<br/>
            3. Copy the HTTP API Token and paste it below. You own this bot completely.
          </p>
          
          {loadingTelegram ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
            </div>
          ) : hasTelegramToken ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[20px]">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Saved Token</div>
                  <div className="font-mono text-xs text-[rgba(255,255,255,0.92)]">{maskedTelegramToken}</div>
                  {botUsername && (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#3B82F6] hover:underline text-xs font-bold mt-1"
                    >
                      <span>@{botUsername}</span>
                      <span className="text-[rgba(255,255,255,0.38)] text-[10px]">↗</span>
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={deleteTelegramToken}
                  disabled={loading}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-full transition-colors cursor-pointer"
                  title="Delete Token"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-[10px] text-[rgba(255,255,255,0.4)]">To update your token, delete the existing one first.</p>

              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-bold text-gray-400">Chat ID</h3>
                <p className="text-[11px] text-[rgba(255,255,255,0.5)]">
                  4. Open your bot in Telegram and send <code>/start</code>.<br/>
                  5. Click Detect below, or paste your Chat ID manually.
                </p>
                {hasChatId ? (
                  <div className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[20px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Saved Chat ID</div>
                      <div className="font-mono text-xs mt-1">{maskedChatId}</div>
                    </div>
                    <button type="button" onClick={detectChatId} disabled={detectingChatId}
                      className="text-xs font-bold text-[#3B82F6] hover:underline disabled:opacity-50 cursor-pointer">
                      {detectingChatId ? 'Detecting…' : 'Re-detect'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button 
                      type="button" 
                      onClick={detectChatId} 
                      disabled={detectingChatId}
                      className="w-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white px-4 py-2.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-[rgba(255,255,255,0.08)]"
                    >
                      {detectingChatId ? 'Detecting Chat ID…' : 'Detect Chat ID from /start message'}
                    </button>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatIdInput}
                        onChange={e => setChatIdInput(e.target.value)}
                        placeholder="Or paste Chat ID manually"
                        className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2 text-xs font-mono focus:outline-none focus:border-[#3B82F6]/60 text-white"
                      />
                      <button 
                        type="button" 
                        onClick={saveChatId} 
                        disabled={loading || !chatIdInput.trim()}
                        className="bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 border-t border-[rgba(255,255,255,0.25)] shadow-md cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">Telegram Bot Token</label>
                <input
                  type="text"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklmNOPqrstUVwxyZ"
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-all font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !telegramToken}
                className="bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border-t border-[rgba(255,255,255,0.25)] active:scale-95 cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={14} />
                {loading ? 'Saving...' : 'Save Token'}
              </button>
            </form>
          )}
        </section>

        {/* Timezone */}
        <section 
          className="bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] p-6 backdrop-blur-[20px]"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-2">Timezone</h2>
          <p className="text-xs text-[rgba(255,255,255,0.5)] mb-4">
            Used to resolve reminder times. Auto-detected from your browser.
          </p>
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]/60 transition-all appearance-none pr-8 cursor-pointer font-semibold"
            >
              {Intl.supportedValuesOf('timeZone').map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-4 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border-t border-[rgba(255,255,255,0.25)] active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Timezone'}
          </button>
        </section>

        {/* Global Notification Defaults */}
        <section 
          className="bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] p-6 backdrop-blur-[20px]"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-2">Global Notification Defaults</h2>
          <p className="text-xs text-[rgba(255,255,255,0.5)] mb-6">
            These settings will be inherited by new reminders unless you override them per-item.
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3 ml-1">Default Channels</label>
              <div className="flex gap-4 flex-wrap">
                {['email', 'push', 'telegram', 'in_app'].map(ch => (
                  <label key={ch} className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.8)] cursor-pointer select-none">
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
              <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3 ml-1">Default Timing</label>
              <div className="relative">
                <select
                  value={defaultLeadTime}
                  onChange={(e) => setDefaultLeadTime(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]/60 transition-all appearance-none pr-8 cursor-pointer font-semibold"
                >
                  <option value="at_time">At time of event</option>
                  <option value="morning_of">Morning of</option>
                  <option value="noon_of">Noon of</option>
                  <option value="evening_of">Evening of</option>
                  <option value="custom">Custom Time</option>
                </select>
              </div>
              {defaultLeadTime === 'custom' && (
                <input
                  type="time"
                  value={defaultCustomTime}
                  onChange={(e) => setDefaultCustomTime(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]/60 transition-all mt-3 font-semibold"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3 ml-1">Escalation Nudge Delay (Hours)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={nudgeDelayHours}
                onChange={(e) => setNudgeDelayHours(parseInt(e.target.value) || 4)}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]/60 transition-all font-semibold"
              />
              <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-2">Time to wait before sending a follow-up nudge if a task is not marked done.</p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border-t border-[rgba(255,255,255,0.25)] active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>
        </section>

        {/* Testing & Diagnostics */}
        <section 
          className="bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] p-6 backdrop-blur-[20px]"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-6">Test Notifications</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => testChannel('email')}
              className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Mail size={14} className="text-[#3B82F6]" /> Email
            </button>
            <button
              onClick={() => testChannel('push')}
              className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Bell size={14} className="text-[#3B82F6]" /> Push
            </button>
            <button
              onClick={() => testChannel('telegram')}
              className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Send size={14} className="text-[#3B82F6]" /> Telegram
            </button>
          </div>
        </section>

        {/* Delivery Logs */}
        <section 
          className="bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] p-6 backdrop-blur-[20px]"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Recent Delivery Logs</h2>
          {logs.length === 0 ? (
            <p className="text-xs text-[rgba(255,255,255,0.4)]">No logs available.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className="flex justify-between items-center text-xs p-3 bg-[rgba(255,255,255,0.02)] rounded-[20px] border border-[rgba(255,255,255,0.04)]">
                  <div>
                    <span className="text-[rgba(255,255,255,0.92)] capitalize font-semibold">{log.channel}</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.38)]">•</span>
                    <span className={log.status === 'sent' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{log.status}</span>
                  </div>
                  <div className="text-[rgba(255,255,255,0.38)] font-mono text-[10px]">
                    {new Date(log.created_at || log.scheduled_for).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Account & Sessions */}
        <section 
          className="bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] rounded-[28px] p-6 backdrop-blur-[20px]"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <h2 className="text-lg font-bold text-white mb-2">Account & Sessions</h2>
          <p className="text-xs text-[rgba(255,255,255,0.5)] mb-6">
            Manage your account data and active sessions.
          </p>

          <div className="space-y-6">
            {currentUser && (
              <div className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[20px]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Current Session</div>
                  <div className="font-bold text-sm mt-1">{currentUser.email}</div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.45)] mt-1">
                    Last signed in: {currentUser.last_sign_in_at ? new Date(currentUser.last_sign_in_at).toLocaleString() : 'Unknown'}
                  </div>
                </div>
                <div className="px-3 py-1 bg-[rgba(16,185,129,0.15)] text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Active now
                </div>
              </div>
            )}

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={exportData}
                className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Download size={14} className="text-[#3B82F6]" /> Export Data
              </button>
              <button
                onClick={logoutAllDevices}
                className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <LogOut size={14} className="text-[#3B82F6]" /> Sign Out All Devices
              </button>
              <button
                onClick={async () => {
                  await supabaseRef.current.auth.signOut()
                  router.refresh()
                  window.location.href = '/login'
                }}
                className="bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.15)] border border-red-500/20 text-red-400 px-5 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <LogOut size={14} /> Sign Out Current
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-[rgba(239,68,68,0.06)] border border-red-500/20 rounded-[28px] p-6 mt-12">
          <h2 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
            <ShieldAlert size={20} /> Danger Zone
          </h2>
          <p className="text-xs text-red-400/80 mb-6 leading-relaxed">
            Permanently delete your account, all reminders, and revoke all external tokens. This action cannot be undone.
          </p>
          <button
            onClick={deleteAccount}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border border-red-500/30 active:scale-95 cursor-pointer flex items-center gap-2 shadow-md"
          >
            <Trash2 size={14} />
            Delete Account
          </button>
        </section>

      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-full shadow-lg text-xs font-bold transition-all ${
          toast.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          {toast.message}
        </div>
      )}

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        title={confirmModal.title}
      >
        <p className="text-[rgba(255,255,255,0.8)] text-sm mb-6">{confirmModal.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={confirmModal.onConfirm}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full text-white transition-all active:scale-95 cursor-pointer ${
              confirmModal.isDestructive 
                ? 'bg-red-500 hover:bg-red-600 border-t border-[rgba(255,255,255,0.2)] shadow-md' 
                : 'bg-[#3B82F6] hover:bg-[#5B9CFF] border-t border-[rgba(255,255,255,0.25)] shadow-md'
            }`}
          >
            Confirm
          </button>
        </div>
      </Modal>
    </AppShell>
  )
}
