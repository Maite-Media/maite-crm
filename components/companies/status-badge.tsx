type CompanyStatus = 'prospect' | 'active' | 'paused' | 'lost' | null

const config: Record<string, { label: string; className: string; style: React.CSSProperties }> = {
  prospect: {
    label: 'PROSPECTO',
    className: 'bg-zinc-800 text-zinc-400',
    style: { border: '1px solid rgba(113,113,122,0.4)' },
  },
  active: {
    label: 'ACTIVO',
    className: 'bg-green-900/30 text-green-400',
    style: { border: '1px solid rgba(34,197,94,0.35)', boxShadow: '0 0 6px rgba(34,197,94,0.1)' },
  },
  paused: {
    label: 'PAUSADO',
    className: 'bg-amber-900/20 text-amber-400',
    style: { border: '1px solid rgba(217,119,6,0.35)' },
  },
  lost: {
    label: 'PERDIDO',
    className: 'bg-[#E31E24]/10 text-[#E31E24]',
    style: { border: '1px solid rgba(227,30,36,0.35)' },
  },
}

export function StatusBadge({ status }: { status: CompanyStatus }) {
  if (!status) return null
  const c = config[status]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm ${c.className}`} style={c.style}>
      {c.label}
    </span>
  )
}
