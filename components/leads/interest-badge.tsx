import { Badge } from '@/components/ui/badge'

type InterestLevel = 'cold' | 'warm' | 'hot' | null

interface InterestBadgeProps {
  level: InterestLevel
}

const variantMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
  cold: 'default',
  warm: 'secondary',
  hot: 'destructive',
}

const labelMap: Record<string, string> = {
  cold: 'Frío',
  warm: 'Tibio',
  hot: 'Caliente',
}

export function InterestBadge({ level }: InterestBadgeProps) {
  if (!level) return null

  return (
    <Badge variant={variantMap[level]}>
      {labelMap[level]}
    </Badge>
  )
}