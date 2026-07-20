'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'

export function ResilientBrandImage({ name, src, size = 'md', fallback = 'icon' }: { name: string; src?: string | null; size?: 'sm' | 'md'; fallback?: 'icon' | 'initials' }) {
  const [failed, setFailed] = useState(false)
  const dimensions = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R'

  return (
    <span className={`${dimensions} inline-flex shrink-0 items-center justify-center overflow-hidden bg-[rgba(59,130,246,0.16)] text-xs font-bold text-[#8DB8FF]`}>
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : (
        <>{fallback === 'initials' || src ? initials : <CreditCard size={size === 'sm' ? 14 : 17} />}</>
      )}
    </span>
  )
}
