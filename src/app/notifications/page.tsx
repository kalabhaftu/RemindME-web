'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

type InAppNotification = {
  id: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
  reminder_item_id: string | null
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  useEffect(() => {
    const supabase = supabaseRef.current
    loadNotifications(supabase)
  }, [])

  const loadNotifications = async (supabase: ReturnType<typeof createBrowserClient>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setNotifications(data)
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const supabase = supabaseRef.current
    await supabase.from('in_app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  const markAllRead = async () => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('in_app_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
    setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
  }

  const unread = notifications.filter(n => !n.read_at).length

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6 lg:p-12 font-sans">
      <header className="max-w-2xl mx-auto flex items-center gap-4 mb-12">
        <Link href="/" className="text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[rgba(255,255,255,0.92)] flex-1">Notifications</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-[#3B82F6] hover:text-[#5B9CFF] transition-colors">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
            <Bell size={32} className="mx-auto mb-4 text-[rgba(255,255,255,0.1)]" />
            <p className="text-[rgba(255,255,255,0.38)]">No notifications yet.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read_at && markAsRead(n.id)}
              className={`p-4 rounded-[12px] border cursor-pointer transition-colors ${
                n.read_at
                  ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]'
                  : 'bg-[rgba(59,130,246,0.06)] border-[#3B82F6]/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm truncate ${n.read_at ? 'text-[rgba(255,255,255,0.6)]' : 'text-white font-medium'}`}>
                    {n.title}
                  </h3>
                  {n.body && (
                    <p className="text-xs text-[rgba(255,255,255,0.45)] mt-1 line-clamp-2">{n.body}</p>
                  )}
                </div>
                <time className="text-[11px] text-[rgba(255,255,255,0.3)] whitespace-nowrap font-mono">
                  {format(new Date(n.created_at), 'MMM d, HH:mm')}
                </time>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
