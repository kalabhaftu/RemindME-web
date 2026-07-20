'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const releaseUrl = 'https://github.com/kalabhaftu/RemindME-mobile/releases/latest'

export function MobileAppHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isMobile) return
    const dismissedAt = Number(localStorage.getItem('remindme-mobile-hint-dismissed') || 0)
    if (!dismissedAt || Date.now() - dismissedAt > 14 * 24 * 60 * 60 * 1000) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <aside className="rm-surface-elevated mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-xs" role="status">
      <Download size={16} className="mt-0.5 shrink-0 text-[var(--accent-400)]" />
      <p className="flex-1 leading-5 text-[var(--text-secondary)]">
        RemindME works best in the Android app. You can keep using the web or get the latest signed APK from GitHub.
        <a href={releaseUrl} target="_blank" rel="noreferrer" className="ml-1 font-semibold text-[var(--accent-400)] hover:text-white">Get the app</a>
      </p>
      <button
        type="button"
        aria-label="Dismiss app suggestion"
        onClick={() => {
          localStorage.setItem('remindme-mobile-hint-dismissed', String(Date.now()))
          setVisible(false)
        }}
        className="shrink-0 rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-white"
      >
        <X size={14} />
      </button>
    </aside>
  )
}
