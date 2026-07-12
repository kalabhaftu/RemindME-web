import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

type Option = {
  value: string
  label: string
}

type CustomSelectProps = {
  value: string
  onChange: (val: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function CustomSelect({ value, onChange, options, placeholder, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.value === value)

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-[rgba(255,255,255,0.92)] focus:outline-none focus:border-[#3B82F6]/60 transition-colors text-left text-sm"
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder || 'Select...'}</span>
        <ChevronDown size={16} className={`shrink-0 text-[rgba(255,255,255,0.4)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 w-full mt-1 bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] rounded-[8px] shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[rgba(255,255,255,0.05)] transition-colors ${
                value === option.value ? 'text-[#3B82F6] font-medium bg-[rgba(59,130,246,0.1)]' : 'text-[rgba(255,255,255,0.8)]'
              }`}
            >
              <span className="truncate pr-2">{option.label}</span>
              {value === option.value && <Check size={14} className="shrink-0 text-[#3B82F6]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
