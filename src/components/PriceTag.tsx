interface Props { level: number; className?: string }

export default function PriceTag({ level, className = '' }: Props) {
  return (
    <span className={`text-sm font-medium ${className}`}>
      {'$'.repeat(level)}<span className="opacity-30">{'$'.repeat(4 - level)}</span>
    </span>
  )
}
