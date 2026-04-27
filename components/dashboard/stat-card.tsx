'use client'

import { LucideIcon, Users, Target, CheckSquare, TrendingUp } from 'lucide-react'

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
    <div className="bg-background border rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% vs mes anterior</span>
          </div>
        )}
      </div>
    </div>
  )
}