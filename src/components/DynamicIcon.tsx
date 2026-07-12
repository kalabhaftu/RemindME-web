import Image from 'next/image'

export function DynamicIcon({ name, className, style }: { name: string, className?: string, style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ ...style, position: 'relative' }}>
      <Image 
        src={`/${name}.png`} 
        alt={name}
        fill
        className="object-contain"
      />
    </div>
  )
}
