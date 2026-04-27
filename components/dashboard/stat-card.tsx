'use client'

import { Users, Target, CheckSquare, TrendingUp } from 'lucide-react'

const iconMap = { Users, Target, CheckSquare, TrendingUp } as const
type IconName = keyof typeof iconMap

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  iconName: IconName
  iconBg: string
  iconColor: string
  trend?: { value: number; isPositive: boolean }
}

export function StatCard({ title, value, subtitle, iconName, iconBg, iconColor, trend }: StatCardProps) {
  const Icon = iconMap[iconName]
  return (
    <div className="bg-background border border-border/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
      <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-foreground mt-1 leading-none tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
        {trend && (
          <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend.isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% vs mes ant.</span>
          </div>
        )}
      </div>
    </div>
  )
}