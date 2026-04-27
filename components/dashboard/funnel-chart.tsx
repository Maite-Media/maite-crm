'use client'

interface FunnelStage {
  name: string
  count: number
  is_won: boolean
  is_lost: boolean
}

interface FunnelChartProps {
  data: FunnelStage[]
}

export function FunnelChart({ data }: FunnelChartProps) {
  const activeStages = data.filter(s => !s.is_lost)
  const maxCount = Math.max(...activeStages.map(s => s.count), 1)

  return (
    <div className="space-y-2">
      {activeStages.map((stage, index) => {
        const width = Math.max((stage.count / maxCount) * 100, 8)
        const nextStage = activeStages[index + 1]
        const conversionRate = nextStage && stage.count > 0
          ? Math.round((nextStage.count / stage.count) * 100)
          : null

        return (
          <div key={stage.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{stage.count}</span>
                {conversionRate !== null && (
                  <span className="text-xs text-muted-foreground">→ {conversionRate}%</span>
                )}
              </div>
            </div>
            <div className="h-6 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: stage.is_won ? '#22c55e' : '#E31E24',
                  opacity: stage.is_won ? 1 : 0.7 + (index * 0.05),
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}