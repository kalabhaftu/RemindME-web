import { Check } from 'lucide-react'

type CustomCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function CustomCheckbox({ checked, onChange, label, className = '' }: CustomCheckboxProps) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer group ${className}`}>
      <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${
        checked 
          ? 'bg-[#3B82F6] border-[#3B82F6]' 
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.15)] group-hover:border-[rgba(255,255,255,0.3)]'
      }`}>
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </div>
      {label && <span className="text-sm text-[rgba(255,255,255,0.92)] select-none">{label}</span>}
    </label>
  )
}
