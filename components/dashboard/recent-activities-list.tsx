import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Activity, ActivityType } from '@/lib/actions/activities'
import { User } from 'lucide-react'

interface RecentActivitiesListProps {
  activities: Activity[]
}

const activityIcons: Record<ActivityType, string> = {
  note: '📝',
  call: '📞',
  email: '📧',
  whatsapp: '💬',
  meeting: '👥',
  stage_change: '🔄',
  task_created: '✅',
  proposal_sent: '📄',
  system: '⚙️',
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'justo ahora'
  if (diffMins < 60) return `hace ${diffMins} min`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays}d`
  return date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })
}

export function RecentActivitiesList({ activities }: RecentActivitiesListProps) {
  function getEntityInfo(activity: Activity): { label: string; href: string } | null {
    if (activity.contact_id && activity.contacts) {
      const name = `${activity.contacts.first_name}${activity.contacts.last_name ? ` ${activity.contacts.last_name}` : ''}`
      return { label: name, href: `/leads?open=${activity.contact_id}` }
    }
    if (activity.company_id && activity.companies) {
      return { label: activity.companies.name, href: `/companies?open=${activity.company_id}` }
    }
    if (activity.opportunity_id && activity.opportunities) {
      return { label: activity.opportunities.title, href: `/pipeline?open=${activity.opportunity_id}` }
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actividades recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin actividades recientes
          </p>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => {
              const userName = activity.profiles?.full_name
              const isSystem = !userName || activity.type === 'system'
              const entityInfo = getEntityInfo(activity)

              return (
                <li key={activity.id} className="flex gap-3 text-sm">
                  <span className="text-lg shrink-0">
                    {activityIcons[activity.type] || '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">
                      {activity.type === 'note' ? (
                        <span>Nota: <span className="font-normal">{activity.description}</span></span>
                      ) : (
                        activity.description
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      {entityInfo && (
                        <Link
                          href={entityInfo.href}
                          className="text-xs font-medium text-[#E31E24] bg-[#E31E24]/10 hover:bg-[#E31E24]/20 px-1.5 py-0.5 rounded transition-colors"
                        >
                          {entityInfo.label}
                        </Link>
                      )}
                      {isSystem ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Sistema
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">
                          {userName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        • {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}