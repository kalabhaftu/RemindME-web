import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { GlassCard, GlassButton } from '@/components/liquid-glass'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <GlassCard tint={0.68} blur={16} className="max-w-md w-full rounded-[24px] p-8">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔍</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm text-[rgba(255,255,255,0.6)] mb-6 leading-relaxed">
          The page or reminder you're looking for doesn't exist, may have been removed, or you don't have access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <GlassButton asChild material="tinted" size="md" className="bg-[#3B82F6] text-white">
            <Link href="/">
              <Home size={16} /> Dashboard
            </Link>
          </GlassButton>
          <GlassButton asChild size="md">
            <Link href="/people">
              <ArrowLeft size={16} /> View People
            </Link>
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}
