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
    <div className="relative bg-[#111111] border border-white/5 rounded-sm p-4 overflow-hidden group hover:border-[#E31E24]/30 transition-colors">
      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/50" />

      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-sm shrink-0 ${iconBg}`}>
          <Icon className={`size-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono tracking-[0.15em] text-zinc-500 uppercase truncate">{title}</p>
          <p
            className="text-3xl font-mono font-bold text-white mt-1 leading-none tracking-tight"
            style={{ textShadow: '0 0 20px rgba(227,30,36,0.45)' }}
          >
            {value}
          </p>
          {subtitle && <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">{subtitle}</p>}
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm ${trend.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-[#E31E24]/10 text-[#E31E24]'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% vs ant.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
