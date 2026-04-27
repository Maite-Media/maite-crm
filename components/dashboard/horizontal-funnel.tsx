'use client'

interface FunnelStage {
  name: string
  count: number
  is_won: boolean
  is_lost: boolean
}

export function HorizontalFunnel({ data }: { data: FunnelStage[] }) {
  const active = data.filter(s => !s.is_lost)
  const max = Math.max(...active.map(s => s.count), 1)

  return (
    <div className="space-y-2.5">
      {active.map((stage, i) => {
        const pct = Math.max((stage.count / max) * 100, 6)
        const next = active[i + 1]
        const conv = next && stage.count > 0 ? Math.round((next.count / stage.count) * 100) : null
        const color = stage.is_won ? '#22c55e' : '#E31E24'

        return (
          <div key={stage.name} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-32 truncate shrink-0">{stage.name}</span>
            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
              <div className="h-full rounded-sm flex items-center px-2 transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }}>
                {stage.count > 0 && <span className="text-white text-xs font-bold">{stage.count}</span>}
              </div>
            </div>
            {conv !== null && <span className="text-xs text-muted-foreground w-10 shrink-0">{conv}%</span>}
            {conv === null && <span className="text-xs font-medium w-10 shrink-0 text-right">{stage.count}</span>}
          </div>
        )
      })}
    </div>
  )
}