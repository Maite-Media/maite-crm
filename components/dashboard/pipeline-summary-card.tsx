'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { businessConfig } from '@/config/business-config'

interface PipelineStage {
  id: string
  name: string
  color: string
  is_won: boolean
  is_lost: boolean
  totalValue: number
  count: number
}

interface PipelineSummaryCardProps {
  stages: PipelineStage[]
}

function formatCurrency(value: number): string {
  return `${businessConfig.currencySymbol}${value.toLocaleString('es-PY')}`
}

export function PipelineSummaryCard({ stages }: PipelineSummaryCardProps) {
  // Filter out won/lost stages for the summary, or show them differently
  const activeStages = stages.filter(s => !s.is_won && !s.is_lost)
  const maxValue = Math.max(...activeStages.map(s => s.totalValue), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumen del pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map(stage => {
          const barWidth = stage.is_won || stage.is_lost
            ? 100
            : Math.round((stage.totalValue / maxValue) * 100)

          return (
            <div key={stage.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className={stage.is_won || stage.is_lost ? 'text-muted-foreground' : ''}>
                    {stage.name}
                  </span>
                  {stage.is_won && (
                    <span className="text-xs text-green-600 font-medium">✓</span>
                  )}
                  {stage.is_lost && (
                    <span className="text-xs text-red-600 font-medium">✗</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{stage.count} opp</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(stage.totalValue)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: stage.is_won ? '#22c55e' : stage.is_lost ? '#ef4444' : stage.color,
                    opacity: stage.is_won || stage.is_lost ? 0.5 : 1,
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
