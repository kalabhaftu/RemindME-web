'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BellRing, Search, Layout, Settings, Plus, Home, Users, CreditCard, CheckSquare, Gift, MoreVertical } from 'lucide-react'
import { MobileAppHint } from '@/components/MobileAppHint'
import { GlassCard, GlassButton, GlassTabs } from '@/components/liquid-glass'
import {
  GlassDropdownMenu,
  GlassDropdownMenuTrigger,
  GlassDropdownMenuContent,
  GlassDropdownMenuItem,
} from '@/components/liquid-glass/glass-dropdown-menu'

const BASE_NAV_ITEMS = [
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
  const router = useRouter()

  // Dynamically append utility pages to nav items only when currently active on them
  const navItems = [...BASE_NAV_ITEMS]
  if (pathname.startsWith('/settings')) {
    navItems.push({ href: '/settings', label: 'Settings', icon: Settings })
  } else if (pathname.startsWith('/search')) {
    navItems.push({ href: '/search', label: 'Search', icon: Search })
  } else if (pathname.startsWith('/templates')) {
    navItems.push({ href: '/templates', label: 'Templates', icon: Layout })
  }

  const activeNavHref =
    navItems.find(({ href }) => (href === '/' ? pathname === '/' : pathname.startsWith(href)))?.href ?? '/'

  return (
    <div className="relative min-h-screen text-[rgba(255,255,255,0.92)] font-sans pb-12 overflow-x-clip bg-[var(--bg-canvas)]">
      {/* Animated background blobs (Subtle blue/black, no purple) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#1e3a8a] to-[#3b82f6] opacity-[0.12] mix-blend-screen filter blur-[90px]"
          style={{
            top: '5%',
            left: '10%',
            animation: 'shell-float-1 30s infinite alternate ease-in-out'
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0f172a] to-[#0ea5e9] opacity-[0.08] mix-blend-screen filter blur-[100px]"
          style={{
            bottom: '10%',
            right: '5%',
            animation: 'shell-float-2 35s infinite alternate ease-in-out'
          }}
        />
      </div>

      {/* Floating Island Header with Liquid Glass Refraction */}
      <div className="sticky top-0 z-40 max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2 pointer-events-none">
        <GlassCard live tint={0.65} blur={16} className="w-full rounded-[24px] pointer-events-auto">
          <header className="relative z-10 w-full px-4 py-3 sm:px-6 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center justify-between gap-4 w-full md:w-auto">
              <div className="flex items-center gap-3 min-w-0">
                <Link href="/notifications" className="w-9 h-9 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors shrink-0">
                  <BellRing size={16} className="text-[#3B82F6]" />
                </Link>
                <Link href="/" className="text-[20px] font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent shrink-0">
                  RemindME
                </Link>
                {title && (
                  <>
                    <span className="text-[rgba(255,255,255,0.2)]">/</span>
                    <h1 className="text-[14px] font-medium text-[rgba(255,255,255,0.6)] truncate">{title}</h1>
                  </>
                )}
              </div>

              {/* Mobile Right Utility Cluster */}
              <div className="flex items-center gap-2 md:hidden">
                {action}
                <GlassDropdownMenu>
                  <GlassDropdownMenuTrigger asChild>
                    <GlassButton size="sm" aria-label="More navigation" className="w-9 h-9 !px-0 rounded-xl">
                      <MoreVertical size={16} />
                    </GlassButton>
                  </GlassDropdownMenuTrigger>
                  <GlassDropdownMenuContent>
                    <GlassDropdownMenuItem onSelect={() => router.push('/search')}>
                      <Search size={14} className="text-[#3B82F6] mr-2" /> Search
                    </GlassDropdownMenuItem>
                    <GlassDropdownMenuItem onSelect={() => router.push('/templates')}>
                      <Layout size={14} className="text-[#3B82F6] mr-2" /> Templates
                    </GlassDropdownMenuItem>
                    <GlassDropdownMenuItem onSelect={() => router.push('/settings')}>
                      <Settings size={14} className="text-[#3B82F6] mr-2" /> Settings
                    </GlassDropdownMenuItem>
                  </GlassDropdownMenuContent>
                </GlassDropdownMenu>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto flex justify-center">
              <GlassTabs
                aria-label="Primary Navigation"
                value={activeNavHref}
                onValueChange={(href) => router.push(href)}
                size="md"
                highlightClassName="bg-[#3B82F6] text-white"
                options={navItems.map(({ href, label, icon: Icon }) => ({
                  value: href,
                  label: <span className="hidden md:inline">{label}</span>,
                  icon: <Icon size={13} />,
                  'aria-label': label,
                }))}
              />
            </div>

            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <Link href="/search" className="p-2.5 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded-xl transition-all" title="Search">
                <Search size={16} />
              </Link>
              <Link href="/templates" className="p-2.5 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded-xl transition-all" title="Templates">
                <Layout size={16} />
              </Link>
              <Link href="/settings" className="p-2.5 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded-xl transition-all" title="Settings">
                <Settings size={16} />
              </Link>
              {action}
            </div>
          </header>
        </GlassCard>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <MobileAppHint />
        {children}
      </main>

      <style jsx global>{`
        @keyframes shell-float-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes shell-float-2 {
          0% { transform: translate(0px, 0px) scale(1.05); }
          100% { transform: translate(-40px, -50px) scale(0.95); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

export function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <GlassButton asChild material="tinted" size="sm" className="bg-[#3B82F6] text-white shrink-0">
      <Link href={href}>
        <Plus size={14} />
        <span>{label}</span>
      </Link>
    </GlassButton>
  )
}
