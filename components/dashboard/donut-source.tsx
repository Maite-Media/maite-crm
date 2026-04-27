'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#E31E24', '#0A0A0A', '#6366f1', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899']

interface LegendProps {
  data: Array<{ name: string; value: number }>
  total: number
}

function CustomLegend({ data, total }: LegendProps) {
  return (
    <div className="flex flex-col justify-center gap-1.5">
      {data.map((entry, i) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
          <span className="text-xs text-muted-foreground truncate max-w-[90px]">{entry.name}</span>
          <span className="text-xs font-semibold text-foreground ml-auto pl-2">
            {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  )
}

export function DonutSource({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
        Sin datos aún
      </div>
    )
  }
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex items-center gap-4 h-44">
      <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={66}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xl font-bold leading-none">{total}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">leads</p>
          </div>
        </div>
      </div>
      <CustomLegend data={data} total={total} />
    </div>
  )
}
