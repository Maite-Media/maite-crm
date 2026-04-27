'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#E31E24', '#0A0A0A', '#6366f1', '#f59e0b', '#22c55e', '#06b6d4']

export function DonutSource({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Sin datos aún</div>
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="35%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '8px', fontSize: '11px' }} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-lg font-bold">{total}</p>
        <p className="text-xs text-muted-foreground">total</p>
      </div>
    </div>
  )
}