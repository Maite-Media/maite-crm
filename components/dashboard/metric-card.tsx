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
  blue: 'text-blue-600 bg-blue-50',
  orange: 'text-orange-600 bg-orange-50',
  red: 'text-red-600 bg-red-50',
  green: 'text-green-600 bg-green-50',
}

export function MetricCard({ title, value, icon: Icon, iconColor = 'blue', trend }: MetricCardProps) {
  const colorClass = ICON_COLORS[iconColor] || ICON_COLORS.blue

  return (
    <Card>
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
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}