type InterestLevel = 'cold' | 'warm' | 'hot' | null

const config: Record<string, { label: string; style: React.CSSProperties; className: string }> = {
  cold: {
    label: 'FRÍO',
    className: 'bg-zinc-800 text-zinc-400',
    style: { border: '1px solid rgba(113,113,122,0.4)' },
  },
  warm: {
    label: 'TIBIO',
    className: 'bg-amber-900/20 text-amber-400',
    style: { border: '1px solid rgba(217,119,6,0.35)' },
  },
  hot: {
    label: 'HOT',
    className: 'bg-[#E31E24]/10 text-[#E31E24]',
    style: { border: '1px solid rgba(227,30,36,0.35)', boxShadow: '0 0 8px rgba(227,30,36,0.15)' },
  },
}

export function InterestBadge({ level }: { level: InterestLevel }) {
  if (!level) return null
  const c = config[level]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm ${c.className}`} style={c.style}>
      {c.label}
    </span>
  )
}
