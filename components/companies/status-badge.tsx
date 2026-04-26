import { Badge } from '@/components/ui/badge'

type CompanyStatus = 'prospect' | 'active' | 'paused' | 'lost' | null

interface StatusBadgeProps {
  status: CompanyStatus
}

const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  prospect: 'outline',
  active: 'default',
  paused: 'secondary',
  lost: 'destructive',
}

const labelMap: Record<string, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  paused: 'Pausado',
  lost: 'Perdido',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null

  return (
    <Badge variant={variantMap[status]}>
      {labelMap[status]}
    </Badge>
  )
}
