import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { GlassCard, GlassButton } from '@/components/liquid-glass'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <GlassCard
        live
        tint={0.72}
        blur={16}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">{title}</h2>
          <GlassButton
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 !px-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </GlassButton>
        </div>
        <div className="p-4">
          {children}
        </div>
      </GlassCard>
    </div>
  )
}
