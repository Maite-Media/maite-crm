'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createActivity } from '@/lib/actions/activities'
import type { Activity, ActivityType } from '@/lib/actions/activities'

interface ActivityFeedProps {
  activities: Activity[]
  contactId?: string
  opportunityId?: string
  companyId?: string
  taskId?: string
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

export function ActivityFeed({
  activities,
  contactId,
  opportunityId,
  companyId
}: ActivityFeedProps) {
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return

    startTransition(async () => {
      await createActivity({
        type: 'note',
        description: note,
        contact_id: contactId,
        opportunity_id: opportunityId,
        company_id: companyId,
      })
      setNote('')
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAddNote} className="space-y-2">
        <textarea
          placeholder="Agregar nota..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending || !note.trim()}>
            {isPending ? '...' : 'Agregar nota'}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin actividades aún
          </p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 text-sm">
              <span className="text-lg">{activityIcons[activity.type] || '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground">
                  {activity.type === 'note' ? (
                    <span>Nota: <span className="font-normal">{activity.description}</span></span>
                  ) : (
                    activity.description
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.profiles?.full_name || 'Sistema'} • {formatRelativeTime(activity.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}