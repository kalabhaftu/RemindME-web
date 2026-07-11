'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BellRing, Search, Layout, Settings, Plus, Home, Users, CreditCard, CheckSquare, Gift } from 'lucide-react'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/people', label: 'People', icon: Users },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/holidays', label: 'Holidays', icon: Gift },
]

export function AppShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode
  title?: string
  action?: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[var(--glass-bg)] backdrop-blur-[18px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/notifications" className="w-9 h-9 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors shrink-0">
              <BellRing size={18} className="text-[#3B82F6]" />
            </Link>
            <Link href="/" className="text-[22px] font-semibold tracking-tight text-[rgba(255,255,255,0.92)] shrink-0">
              RemindME
            </Link>
            {title && (
              <>
                <span className="text-[rgba(255,255,255,0.2)]">/</span>
                <h1 className="text-[15px] font-medium text-[rgba(255,255,255,0.6)] truncate">{title}</h1>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link href="/search" className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="Search">
              <Search size={18} />
            </Link>
            <Link href="/templates" className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="Templates">
              <Layout size={18} />
            </Link>
            <Link href="/settings" className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors" title="Settings">
              <Settings size={18} />
            </Link>
            {action}
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-6 lg:px-12 flex gap-1 pb-3 overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.92)]'
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
        {children}
      </main>
    </div>
  )
}

export function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
    >
      <Plus size={16} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
