import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

const ICON_COLORS: Record<string, string> = {
  blue: 'text-[#E31E24] bg-[#E31E24]/10',
  orange: 'text-[#E31E24] bg-[#E31E24]/10',
  red: 'text-[#E31E24] bg-[#E31E24]/10',
  green: 'text-[#E31E24] bg-[#E31E24]/10',
}

export function MetricCard({ title, value, icon: Icon, iconColor = 'blue', trend }: MetricCardProps) {
  const colorClass = ICON_COLORS[iconColor] || ICON_COLORS.blue

  return (
    <Card className="border-l-4 border-l-[#E31E24]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[#0A0A0A]">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}