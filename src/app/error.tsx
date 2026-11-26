'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home, AlertCircle } from 'lucide-react'
import { GlassCard, GlassButton } from '@/components/liquid-glass'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App runtime error caught by boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <GlassCard tint={0.68} blur={16} className="max-w-md w-full rounded-[24px] p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-[rgba(255,255,255,0.6)] mb-6 leading-relaxed">
          An unexpected error occurred while loading this view. You can reload or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <GlassButton
            material="tinted"
            size="md"
            onClick={() => reset()}
            className="bg-[#3B82F6] text-white"
          >
            <RefreshCw size={16} /> Try Again
          </GlassButton>
          <GlassButton asChild size="md">
            <Link href="/">
              <Home size={16} /> Dashboard
            </Link>
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}
