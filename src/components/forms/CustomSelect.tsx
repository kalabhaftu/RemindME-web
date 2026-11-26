'use client'

import { GlassSelect } from '@/components/liquid-glass/glass-select'

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
  return (
    <GlassSelect
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
      options={options}
      placeholder={placeholder}
      className={`!w-full ${className}`}
    />
  )
}
