import { Badge } from '@/components/ui/badge'

type Priority = 'low' | 'medium' | 'high' | null

interface PriorityBadgeProps {
  priority: Priority
}

const variantMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
  low: 'default',
  medium: 'secondary',
  high: 'destructive',
}

const labelMap: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (!priority) return null

  const className = priority === 'medium'
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : priority === 'low'
    ? 'bg-gray-100 text-gray-600 border-gray-300'
    : undefined

  return (
    <Badge variant={variantMap[priority]} className={className}>
      {labelMap[priority]}
    </Badge>
  )
}
