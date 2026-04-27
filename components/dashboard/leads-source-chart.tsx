'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#E31E24', '#0A0A0A', '#6366f1', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6']

interface LeadsSourceChartProps {
  data: Array<{ name: string; value: number }>
}

export function LeadsSourceChart({ data }: LeadsSourceChartProps) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="40%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: '8px', fontSize: '12px' }}
          />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}