'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#E31E24', '#6366f1', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6']

interface LegendProps {
  data: Array<{ name: string; value: number }>
  total: number
}

function CustomLegend({ data, total }: LegendProps) {
  return (
    <div className="flex flex-col justify-center gap-2">
      {data.map((entry, i) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 4px ${COLORS[i % COLORS.length]}80` }}
          />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
            {entry.name}
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-300 ml-auto pl-1">
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
      <div className="h-44 flex items-center justify-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Sin datos
      </div>
    )
  }
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex items-center gap-3 h-44">
      <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={66}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  style={{ filter: `drop-shadow(0 0 4px ${COLORS[i % COLORS.length]}66)` }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#111',
                border: '1px solid rgba(227,30,36,0.3)',
                borderRadius: '2px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#fff',
                boxShadow: '0 0 20px rgba(227,30,36,0.1)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p
              className="text-2xl font-mono font-bold text-white leading-none"
              style={{ textShadow: '0 0 16px rgba(227,30,36,0.5)' }}
            >
              {total}
            </p>
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">leads</p>
          </div>
        </div>
      </div>
      <CustomLegend data={data} total={total} />
    </div>
  )
}
