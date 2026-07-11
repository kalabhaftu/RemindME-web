import { cn } from '@/lib/cn'

export function TagPill({
  children,
  color,
  className,
}: {
  children: React.ReactNode
  color?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium whitespace-nowrap',
        className
      )}
      style={{ backgroundColor: color ?? 'rgba(255,255,255,0.06)' }}
    >
      {children}
    </span>
  )
}
