'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface MiniBarChartProps {
  data: Array<{ month: string; value: number }>
  color?: string
}

function formatValue(value: number): string {
  if (value >= 1000000) return `₲${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₲${(value / 1000).toFixed(0)}K`
  return `₲${value}`
}

export function MiniBarChart({ data, color = '#E31E24' }: MiniBarChartProps) {
  const maxVal = Math.max(...data.map(d => d.value))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatValue} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value) => [formatValue(value as number), 'Ingresos']}
          contentStyle={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '8px', fontSize: '11px' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.value === maxVal ? color : `${color}60`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}