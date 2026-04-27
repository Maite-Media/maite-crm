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
  const nonWon = active.filter(s => !s.is_won)

  return (
    <div className="space-y-2">
      {active.map((stage, i) => {
        const pct = Math.max((stage.count / max) * 100, 5)
        const next = active[i + 1]
        const conv = next && stage.count > 0 ? Math.round((next.count / stage.count) * 100) : null

        let barColor: string
        if (stage.is_won) {
          barColor = '#22c55e'
        } else {
          const idx = nonWon.indexOf(stage)
          const total = nonWon.length
          const opacity = total <= 1 ? 1 : 1 - (idx / (total - 1)) * 0.55
          barColor = `rgba(227, 30, 36, ${opacity.toFixed(2)})`
        }

        return (
          <div key={stage.name}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground w-28 truncate shrink-0">{stage.name}</span>
              <div className="flex-1 h-8 bg-muted/60 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                >
                  {stage.count > 0 && (
                    <span className="text-white text-xs font-bold drop-shadow-sm">{stage.count}</span>
                  )}
                </div>
              </div>
              <div className="w-16 shrink-0 text-right">
                {conv !== null ? (
                  <span className="text-xs text-muted-foreground font-medium">{conv}%</span>
                ) : (
                  <span className={`text-xs font-bold ${stage.is_won ? 'text-green-600' : 'text-foreground'}`}>
                    {stage.count}
                  </span>
                )}
              </div>
            </div>
            {conv !== null && (
              <div className="ml-28 pl-3 flex items-center gap-1 my-0.5">
                <div className="h-px flex-1 border-l border-dashed border-muted-foreground/30" style={{ maxWidth: `${pct}%` }} />
                <span className="text-[10px] text-muted-foreground/60">↓ {conv}% conv.</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
