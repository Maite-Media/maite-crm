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
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatAxisValue}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(value) => [formatTooltipValue(value as number), 'Ingresos']}
          contentStyle={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.value === maxVal && maxVal > 0 ? color : `${color}55`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}