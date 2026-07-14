'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BellRing, Search, Layout, Settings, Plus, Home, Users, CreditCard, CheckSquare, Gift, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/cn'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Performance FPS Safety degradation state
  const [filterScale, setFilterScale] = useState(12)
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const checkFps = () => {
      const now = performance.now()
      frameCount++
      if (now >= lastTime + 1000) {
        const calculatedFps = Math.round((frameCount * 1000) / (now - lastTime))
        if (calculatedFps < 55) {
          setFilterScale(0)
        }
        frameCount = 0
        lastTime = now
      }
      animationId = requestAnimationFrame(checkFps)
    }
    animationId = requestAnimationFrame(checkFps)
    return () => cancelAnimationFrame(animationId)
  }, [])

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  // Dynamically append utility pages to nav items only when currently active on them
  const navItems = [...BASE_NAV_ITEMS]
  if (pathname.startsWith('/settings')) {
    navItems.push({ href: '/settings', label: 'Settings', icon: Settings })
  } else if (pathname.startsWith('/search')) {
    navItems.push({ href: '/search', label: 'Search', icon: Search })
  } else if (pathname.startsWith('/templates')) {
    navItems.push({ href: '/templates', label: 'Templates', icon: Layout })
  }

  return (
    <div className="relative min-h-screen text-[rgba(255,255,255,0.92)] font-sans pb-12 overflow-x-clip bg-[#050609]">
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

      {/* Floating Island Header with Backing Refraction Layer - Sticky & Floating */}
      <div className="sticky top-0 z-40 max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2 pointer-events-none">
        {/* inner container: Removed overflow-hidden so absolute dropdown works */}
        <div className="w-full relative pointer-events-auto">
          {/* Backing Refractor */}
          <div 
            className="absolute inset-0 bg-[rgba(10,12,20,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[24px] backdrop-blur-[20px] z-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.12), 0 20px 50px rgba(0,0,0,0.3)',
              filter: filterScale > 0 ? `url(#liquid-glass-refraction)` : 'none'
            }}
          />
          {/* Interactive Sharp Content on Top */}
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
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-9 h-9 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            <nav className="flex items-center gap-1.5 p-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-full overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto justify-between md:justify-center">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer active:scale-95 flex-grow md:flex-grow-0 justify-center',
                      active
                        ? 'bg-[#3B82F6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] border-t border-[rgba(255,255,255,0.25)]'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    <Icon size={13} className="shrink-0" />
                    {/* Responsive Name: Show always on desktop; show only on active on mobile */}
                    <span className={cn(
                      'transition-all duration-300',
                      active ? 'inline' : 'hidden md:inline'
                    )}>
                      {label}
                    </span>
                  </Link>
                )
              })}
            </nav>

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

          {/* Floating Dropdown Menu for Mobile */}
          {menuOpen && (
            <div 
              ref={menuRef}
              className="absolute right-4 top-16 w-44 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,12,20,0.85)] backdrop-blur-[16px] p-2 z-50 shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col gap-1 md:hidden"
              style={{
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.4)'
              }}
            >
              <Link 
                href="/search" 
                onClick={() => setMenuOpen(false)} 
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[rgba(255,255,255,0.06)] text-gray-300 hover:text-white transition-colors"
              >
                <Search size={14} className="text-[#3B82F6]" /> Search
              </Link>
              <Link 
                href="/templates" 
                onClick={() => setMenuOpen(false)} 
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[rgba(255,255,255,0.06)] text-gray-300 hover:text-white transition-colors"
              >
                <Layout size={14} className="text-[#3B82F6]" /> Templates
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setMenuOpen(false)} 
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[rgba(255,255,255,0.06)] text-gray-300 hover:text-white transition-colors"
              >
                <Settings size={14} className="text-[#3B82F6]" /> Settings
              </Link>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
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
    <Link
      href={href}
      className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-4 py-2 rounded-full text-xs font-semibold transition-all border-t border-[rgba(255,255,255,0.2)] shadow-[0_4px_12px_rgba(59,130,246,0.3)] active:scale-95 cursor-pointer shrink-0"
    >
      <Plus size={14} />
      <span>{label}</span>
    </Link>
  )
}
