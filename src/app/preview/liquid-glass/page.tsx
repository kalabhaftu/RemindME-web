'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LiquidGlassEffects } from '@/components/ui/LiquidGlassEffects'
import { Bell, ShieldAlert, Sparkles, Sliders, Menu, X, Check, Info, RefreshCw, Volume2, Moon, Sun } from 'lucide-react'
import Link from 'next/link'

export default function LiquidGlassPreviewPage() {
  // UI states
  const [sliderVal, setSliderVal] = useState(50)
  const [isToggled, setIsToggled] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' }[]>([])
  
  // Performance states
  const [fps, setFps] = useState(60)
  const [filterScale, setFilterScale] = useState(15) // Dynamic scale based on performance
  const [isLowPerfMode, setIsLowPerfMode] = useState(false)

  // FPS tracking
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const checkFps = () => {
      const now = performance.now()
      frameCount++
      if (now >= lastTime + 1000) {
        const calculatedFps = Math.round((frameCount * 1000) / (now - lastTime))
        setFps(calculatedFps)
        frameCount = 0
        lastTime = now

        // Hardware degradation safety profile:
        // If FPS drops below 55, dynamically lower the displacement map filter scale
        if (calculatedFps < 55) {
          setFilterScale((prev) => Math.max(0, prev - 3))
          setIsLowPerfMode(true)
        } else if (calculatedFps >= 58 && filterScale < 15) {
          setFilterScale((prev) => Math.min(15, prev + 1))
          if (filterScale === 15) {
            setIsLowPerfMode(false)
          }
        }
      }
      animationId = requestAnimationFrame(checkFps)
    }

    animationId = requestAnimationFrame(checkFps)
    return () => cancelAnimationFrame(animationId)
  }, [filterScale])

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const simulateLoading = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      triggerToast('Synced all data with Supabase', 'success')
    }, 2000)
  }

  return (
    <div className="relative min-h-screen w-full bg-[#050609] text-white overflow-x-clip font-sans pb-24">
      {/* Dynamic SVG Filter Definitions */}
      <LiquidGlassEffects />

      {/* Floating dynamic color blobs for high-contrast refraction background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#1e3a8a] to-[#3b82f6] opacity-15 mix-blend-screen filter blur-[90px]"
          style={{
            top: '10%',
            left: '15%',
            animation: 'float-blob-1 25s infinite alternate ease-in-out'
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0f172a] to-[#0ea5e9] opacity-10 mix-blend-screen filter blur-[100px]"
          style={{
            bottom: '15%',
            right: '10%',
            animation: 'float-blob-2 30s infinite alternate ease-in-out'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#1d4ed8] to-[#1e3a8a] opacity-08 mix-blend-screen filter blur-[80px]"
          style={{
            top: '45%',
            left: '50%',
            animation: 'float-blob-3 20s infinite alternate ease-in-out'
          }}
        />
      </div>

      {/* Performance Guardian / Floating Stats badge */}
      <div 
        className="fixed bottom-6 left-6 z-50 px-4 py-2.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(10,12,20,0.65)] backdrop-blur-[12px] flex items-center gap-3 text-xs font-mono shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.4)'
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${fps >= 55 ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
          <span>FPS: {fps}</span>
        </div>
        <div className="w-px h-4 bg-[rgba(255,255,255,0.15)]" />
        <div>Optics: {filterScale}px</div>
        {isLowPerfMode && (
          <>
            <div className="w-px h-4 bg-[rgba(255,255,255,0.15)]" />
            <span className="text-amber-300 font-bold uppercase tracking-wider text-[9px] animate-pulse">Eco-Optics On</span>
          </>
        )}
      </div>

      {/* Floating Island Navigation Header - Sticky & Floating */}
      <div className="sticky top-0 z-40 max-w-7xl mx-auto px-6 pt-4 pb-2 pointer-events-none">
        <div className="w-full relative rounded-[30px] overflow-hidden pointer-events-auto">
          {/* Backing Refractor */}
          <div 
            className="absolute inset-0 bg-[rgba(10,12,20,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[30px] backdrop-blur-[24px] z-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 20px 50px rgba(0,0,0,0.3)',
              filter: `url(#liquid-glass-refraction)`
            }}
          />
          {/* Interactive Sharp Content on Top */}
          <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#0ea5e9] flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                RemindME
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.25)] text-[#5b9cff] text-[10px] uppercase font-bold tracking-widest">
                Liquid v2
              </span>
            </div>

            {/* Tab switches inside Floating Island - Gooey layout */}
            <nav 
              className="hidden md:flex items-center gap-1 p-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-full relative"
              style={{ filter: 'url(#fluid-organic-goo)' }}
            >
              {['Overview', 'Components', 'Performance', 'Settings'].map((tab) => {
                const active = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                      active 
                        ? 'bg-[#3b82f6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link 
                href="/"
                className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-xs font-semibold transition-all cursor-pointer"
              >
                Exit Preview
              </Link>
            </div>
          </header>
        </div>
      </div>

      {/* Main Grid Content Area */}
      <main className="max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Glass Cards & Text Overlays */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Hero Showcase Box */}
          <section 
            className="p-8 md:p-12 rounded-[36px] bg-[rgba(15,18,28,0.45)] border border-[rgba(255,255,255,0.06)] backdrop-blur-[30px] relative overflow-hidden"
            style={{
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1), 0 24px 60px rgba(0,0,0,0.4)',
              contain: 'strict'
            }}
          >
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white max-w-lg">
                Fluid Optics for <span className="bg-gradient-to-r from-[#60a5fa] to-[#0ea5e9] bg-clip-text text-transparent">Modern DOM</span> Rendering
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed max-w-xl">
                Bending background graphics, light refraction, and interactive physics.
                Unlike flat, opaque cards, these elements distort details in real-time, giving you
                an authentic three-dimensional lens refraction directly on your screen.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                {/* Pill Button with catch border */}
                <button
                  onClick={simulateLoading}
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_10px_25px_rgba(37,99,235,0.4)] border-t border-[rgba(255,255,255,0.25)] border-b border-[rgba(0,0,0,0.15)] flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Processing Refraction...' : 'Run Glass Sync'}
                </button>

                <button
                  onClick={() => triggerToast('Optical profile validated!', 'info')}
                  className="px-6 py-3.5 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-white font-semibold text-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  style={{
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                  }}
                >
                  <Sliders size={15} className="text-[#60a5fa]" />
                  Check Contrast
                </button>
              </div>
            </div>

            {/* Inner design lines for decoration */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <svg width="400" height="400" viewBox="0 0 100 100" fill="none" className="text-white">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" />
                <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>
          </section>

          {/* Interactive Component Catalog Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Pill & Switches controls panel */}
            <div className="p-6 rounded-[28px] bg-[rgba(15,18,28,0.4)] border border-[rgba(255,255,255,0.06)] backdrop-blur-[20px] space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-[#3b82f6]" />
                Interactive Controls
              </h3>

              {/* Slider thumb morphing */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold uppercase tracking-wider">Refraction Focus</span>
                  <span className="text-[#60a5fa] font-mono font-bold">{sliderVal}%</span>
                </div>
                <div className="relative flex items-center h-8" style={{ filter: 'url(#fluid-organic-goo)' }}>
                  {/* Slider track */}
                  <div className="absolute w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] pointer-events-none" />
                  <div 
                    className="absolute h-2 rounded-full bg-[#3b82f6] pointer-events-none"
                    style={{ width: `${sliderVal}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderVal}
                    onChange={(e) => setSliderVal(Number(e.target.value))}
                    className="w-full h-full opacity-0 cursor-ew-resize relative z-10"
                  />
                  {/* Visual thumb that expands on slider interaction */}
                  <div 
                    className="absolute w-5 h-5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none transition-all ease-out"
                    style={{ 
                      left: `calc(${sliderVal}% - 10px)`,
                      transform: 'scale(1.2)' 
                    }}
                  />
                </div>
              </div>

              {/* Fluid Switch (Toggle) control */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div>
                  <h4 className="text-sm font-semibold text-white">Chromatic Aberration</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Toggle RGB subpixel shift simulation</p>
                </div>
                <button
                  onClick={() => {
                    setIsToggled(!isToggled)
                    triggerToast(`Subpixel shift ${!isToggled ? 'enabled' : 'disabled'}`, 'info')
                  }}
                  className="w-14 h-8 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] relative p-1 transition-all duration-300 flex items-center cursor-pointer"
                  style={{ filter: 'url(#fluid-organic-goo)' }}
                >
                  <div 
                    className={`w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-md ${
                      isToggled ? 'translate-x-6 bg-gradient-to-r from-rose-400 to-indigo-400' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Micro details: Loading Spinner & Toast simulator */}
            <div className="p-6 rounded-[28px] bg-[rgba(15,18,28,0.4)] border border-[rgba(255,255,255,0.06)] backdrop-blur-[20px] flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                  <Bell size={18} className="text-[#d946ef]" />
                  Micro-UI Feedback
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Test custom liquid spinners and toasts which feel like fluid matter shifting.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => triggerToast('Action performed successfully!', 'success')}
                  className="flex-1 py-3 rounded-full bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold transition-all border-t border-[rgba(255,255,255,0.2)] shadow-[0_4px_12px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
                >
                  Trigger Toast
                </button>
                <button
                  onClick={() => triggerToast('System alerts are active', 'error')}
                  className="flex-1 py-3 rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold transition-all border-t border-[rgba(255,255,255,0.2)] shadow-[0_4px_12px_rgba(239,68,68,0.3)] active:scale-95 cursor-pointer"
                >
                  Trigger Error
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl mt-2">
                <span className="text-xs font-medium text-gray-300">Fluid Spinner</span>
                {/* Custom organic rotating blob spinner */}
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 border-[3px] border-[rgba(255,255,255,0.08)] rounded-full" />
                  <div 
                    className="absolute inset-0 border-[3px] border-t-transparent border-r-[#3b82f6] border-b-[#d946ef] border-l-transparent rounded-full animate-spin"
                    style={{
                      borderRadius: '45% 55% 50% 50% / 50% 50% 50% 50%',
                    }}
                  />
                </div>
              </div>
            </div>

          </section>

        </div>

        {/* Right Column: Settings, Contrast Checks, and Specs */}
        <div className="space-y-8">
          
          {/* Glass Spec Card */}
          <section 
            className="p-6 rounded-[28px] bg-[rgba(15,18,28,0.5)] border border-[rgba(255,255,255,0.08)] backdrop-blur-[20px] space-y-6"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
            }}
          >
            <h3 className="text-md font-bold uppercase tracking-wider text-gray-400">
              Floating Fluid Specs
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-gray-400">Layout Type</span>
                <span className="font-semibold text-white">Floating Islands</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-gray-400">Geometry</span>
                <span className="font-semibold text-white">24px to 9999px Curved</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-gray-400">Disp. Driver</span>
                <span className="font-semibold text-white">feDisplacementMap</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-gray-400">Compositor Safety</span>
                <span className="font-semibold text-emerald-400">will-change / contain</span>
              </div>
            </div>

            {/* Small Contrast alert box */}
            <div className="p-4 rounded-2xl bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#60a5fa]">
                <Info size={14} />
                <span>Legible Color Contrast</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                All overlays leverage deep alpha fills (`rgba(10,12,20,0.65)`) combined with heavy backdrop blur to guarantee WCAG AA text legibility against moving colorful backgrounds.
              </p>
            </div>
          </section>

          {/* Simulated App Reminder card */}
          <section className="p-6 rounded-[28px] bg-[rgba(15,18,28,0.4)] border border-[rgba(255,255,255,0.06)] backdrop-blur-[20px] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d946ef]">Upcoming Reminder</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">Critical</span>
            </div>
            
            <div>
              <h4 className="text-md font-bold text-white">Server Certificate Renewal</h4>
              <p className="text-xs text-gray-400 mt-1">Host: remindme.org (Expires in 2 days)</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => triggerToast('Reminder marked as completed!', 'success')}
                className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-md text-white border-t border-[rgba(255,255,255,0.2)]"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={() => triggerToast('Reminder escalated!', 'info')}
                className="px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-white hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
              >
                Escalate Now
              </button>
            </div>
          </section>

        </div>

      </main>

      {/* Floating Pill Toasts container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-3 rounded-full border shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center gap-2.5 text-xs font-semibold animate-slide-in pointer-events-auto ${
              t.type === 'error'
                ? 'bg-[rgba(239,68,68,0.2)] border-red-500/30 text-red-300'
                : t.type === 'info'
                ? 'bg-[rgba(59,130,246,0.2)] border-blue-500/30 text-blue-300'
                : 'bg-[rgba(16,185,129,0.2)] border-emerald-500/30 text-emerald-300'
            }`}
            style={{
              backdropFilter: 'blur(20px)',
              filter: `url(#liquid-glass-refraction)`,
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.5)'
            }}
          >
            {t.type === 'error' ? (
              <ShieldAlert size={14} />
            ) : t.type === 'info' ? (
              <Info size={14} />
            ) : (
              <Check size={14} />
            )}
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="ml-2 hover:opacity-80 text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Styling for animated background blobs and custom animations */}
      <style jsx global>{`
        @keyframes float-blob-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(120px, 80px) scale(1.15); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          100% { transform: translate(-100px, -120px) scale(0.9); }
        }
        @keyframes float-blob-3 {
          0% { transform: translate(0px, 0px) scale(0.95); }
          100% { transform: translate(70px, -60px) scale(1.05); }
        }
        
        .animate-slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideIn {
          from { transform: translateY(20px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
