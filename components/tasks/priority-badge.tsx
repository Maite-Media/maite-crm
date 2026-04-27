type Priority = 'low' | 'medium' | 'high' | null

const config: Record<string, { label: string; className: string; style: React.CSSProperties }> = {
  low: {
    label: 'BAJA',
    className: 'bg-zinc-800 text-zinc-500',
    style: { border: '1px solid rgba(113,113,122,0.3)' },
  },
  medium: {
    label: 'MEDIA',
    className: 'bg-amber-900/20 text-amber-400',
    style: { border: '1px solid rgba(217,119,6,0.35)' },
  },
  high: {
    label: 'ALTA',
    className: 'bg-[#E31E24]/10 text-[#E31E24]',
    style: { border: '1px solid rgba(227,30,36,0.35)', boxShadow: '0 0 6px rgba(227,30,36,0.15)' },
  },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (!priority) return null
  const c = config[priority]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm ${c.className}`} style={c.style}>
      {c.label}
    </span>
  )
}
