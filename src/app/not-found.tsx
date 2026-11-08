import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[rgba(15,18,28,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[24px] p-8 backdrop-blur-xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔍</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm text-[rgba(255,255,255,0.6)] mb-6 leading-relaxed">
          The page or reminder you're looking for doesn't exist, may have been removed, or you don't have access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            <Home size={16} /> Dashboard
          </Link>
          <Link
            href="/people"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> View People
          </Link>
        </div>
      </div>
    </div>
  )
}
