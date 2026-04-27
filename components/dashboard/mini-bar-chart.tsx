'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface MiniBarChartProps {
  data: Array<{ month: string; value: number }>
  color?: string
}

function formatAxisValue(value: number): string {
  if (value >= 1000000) return `₲${Math.round(value / 1000000)}M`
  if (value >= 1000) return `₲${Math.round(value / 1000)}K`
  if (value === 0) return '₲0'
  return `₲${value}`
}

function formatTooltipValue(value: number): string {
  if (value >= 1000000) return `₲${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `₲${(value / 1000).toFixed(0)}K`
  return `₲${value}`
}

export function MiniBarChart({ data, color = '#E31E24' }: MiniBarChartProps) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }} barCategoryGap="32%">
        <CartesianGrid strokeDasharray="1 4" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'monospace', letterSpacing: '0.05em' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatAxisValue}
          tick={{ fontSize: 9, fill: '#3f3f46', fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={54}
        />
        <Tooltip
          formatter={(value) => [formatTooltipValue(value as number), 'Ingresos']}
          contentStyle={{
            background: '#111',
            border: '1px solid rgba(227,30,36,0.3)',
            borderRadius: '2px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#fff',
            boxShadow: '0 0 20px rgba(227,30,36,0.1)',
          }}
          cursor={{ fill: 'rgba(227,30,36,0.04)' }}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.value === maxVal && maxVal > 0 ? color : `${color}40`}
              style={entry.value === maxVal && maxVal > 0 ? { filter: `drop-shadow(0 0 6px ${color}88)` } : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
