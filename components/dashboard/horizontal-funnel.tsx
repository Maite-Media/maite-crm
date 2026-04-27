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
    <div className="space-y-1.5">
      {active.map((stage, i) => {
        const pct = Math.max((stage.count / max) * 100, 4)
        const next = active[i + 1]
        const conv = next && stage.count > 0 ? Math.round((next.count / stage.count) * 100) : null

        let barColor: string
        let glowColor: string
        if (stage.is_won) {
          barColor = '#22c55e'
          glowColor = 'rgba(34,197,94,0.5)'
        } else {
          const idx = nonWon.indexOf(stage)
          const total = Math.max(nonWon.length - 1, 1)
          const opacity = 1 - (idx / total) * 0.6
          barColor = `rgba(227,30,36,${opacity.toFixed(2)})`
          glowColor = `rgba(227,30,36,${(opacity * 0.5).toFixed(2)})`
        }

        return (
          <div key={stage.name}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase w-28 truncate shrink-0">
                {stage.name}
              </span>
              <div className="flex-1 h-7 bg-[#1a1a1a] rounded-sm overflow-hidden">
                <div
                  className="h-full flex items-center px-2.5 transition-all duration-700 rounded-sm"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    boxShadow: stage.count > 0 ? `0 0 10px ${glowColor}` : 'none',
                  }}
                >
                  {stage.count > 0 && (
                    <span className="text-white text-[10px] font-mono font-bold" style={{ textShadow: '0 0 6px rgba(255,255,255,0.4)' }}>
                      {stage.count}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-14 shrink-0 text-right">
                {conv !== null ? (
                  <span className="text-[10px] font-mono text-zinc-600">{conv}%</span>
                ) : (
                  <span className={`text-[10px] font-mono font-bold ${stage.is_won ? 'text-green-400' : 'text-white'}`}>
                    {stage.count}
                  </span>
                )}
              </div>
            </div>
            {conv !== null && (
              <div className="ml-28 pl-3 flex items-center gap-1.5 my-0.5 opacity-40">
                <div className="w-px h-2 bg-[#E31E24] ml-0.5" />
                <span className="text-[9px] font-mono text-zinc-600">↓ {conv}%</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
