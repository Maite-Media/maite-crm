'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/actions/tasks'
import { Calendar, AlertCircle } from 'lucide-react'

interface TaskWithRelations extends Task {
  contacts?: { first_name: string; last_name: string | null } | null
  companies?: { name: string } | null
  opportunities?: { title: string } | null
}

interface RecentTasksListProps {
  tasks: TaskWithRelations[]
}

const priorityConfig = {
  low: { label: 'Baja', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  medium: { label: 'Media', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  high: { label: 'Alta', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
} as const

function formatDueDate(dateString: string | null): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!dateString) return { label: 'Sin fecha', isOverdue: false, isToday: false }
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 0) return { label: 'Vencida', isOverdue: true, isToday: false }
  if (diffDays === 0) return { label: 'Hoy', isOverdue: false, isToday: true }
  if (diffDays === 1) return { label: 'Mañana', isOverdue: false, isToday: false }
  if (diffDays < 7) return { label: `En ${diffDays} días`, isOverdue: false, isToday: false }
  return { label: date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }), isOverdue: false, isToday: false }
}

export function RecentTasksList({ tasks }: RecentTasksListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Próximas tareas</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay tareas pendientes
          </p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => {
              const dueInfo = formatDueDate(task.due_date)
              const priority = priorityConfig[task.priority] || priorityConfig.medium
              const contactInfo = task.companies?.name || [task.contacts?.first_name, task.contacts?.last_name].filter(Boolean).join(' ')

              return (
                <li key={task.id}>
                  <Link
                    href={`/tasks`}
                    className="flex items-start justify-between gap-3 group hover:bg-accent/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary">
                        {task.title}
                      </p>
                      {contactInfo && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {contactInfo}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        className={cn('text-xs font-medium border', priority.bg, priority.text, priority.border)}
                      >
                        {priority.label}
                      </Badge>
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        dueInfo.isOverdue ? 'text-red-600 font-medium' : dueInfo.isToday ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                      )}>
                        {dueInfo.isOverdue && <AlertCircle className="h-3 w-3" />}
                        {dueInfo.isToday && <Calendar className="h-3 w-3" />}
                        {dueInfo.label}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <Link
          href="/tasks"
          className="block mt-4 text-sm text-center text-muted-foreground hover:text-primary"
        >
          Ver todas las tareas →
        </Link>
      </CardContent>
    </Card>
  )
}