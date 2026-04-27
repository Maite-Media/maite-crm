'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RevenueChartProps {
  data: Array<{ month: string; value: number }>
}

function formatValue(value: number): string {
  if (value >= 1000000) return `₲${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₲${(value / 1000).toFixed(0)}K`
  return `₲${value}`
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E31E24" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#E31E24" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={55} />
          <Tooltip
            formatter={(value) => [formatValue(value as number), 'Ingresos']}
            contentStyle={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '8px', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="value" stroke="#E31E24" strokeWidth={2} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}