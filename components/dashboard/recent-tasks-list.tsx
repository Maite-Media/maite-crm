'use client'

import Link from 'next/link'
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
  low: { label: 'BAJA', color: 'text-zinc-500 bg-zinc-500/10' },
  medium: { label: 'MEDIA', color: 'text-amber-400 bg-amber-400/10' },
  high: { label: 'ALTA', color: 'text-[#E31E24] bg-[#E31E24]/10' },
} as const

function formatDueDate(dateString: string | null): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!dateString) return { label: 'Sin fecha', isOverdue: false, isToday: false }
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 0) return { label: 'VENCIDA', isOverdue: true, isToday: false }
  if (diffDays === 0) return { label: 'HOY', isOverdue: false, isToday: true }
  if (diffDays === 1) return { label: 'MAÑANA', isOverdue: false, isToday: false }
  if (diffDays < 7) return { label: `+${diffDays}d`, isOverdue: false, isToday: false }
  return { label: date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }).toUpperCase(), isOverdue: false, isToday: false }
}

export function RecentTasksList({ tasks }: RecentTasksListProps) {
  return (
    <div className="relative bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/50 z-10" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/50 z-10" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/50 z-10" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/50 z-10" />

      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-amber-400 rounded-sm" style={{ boxShadow: '0 0 6px rgba(251,191,36,0.7)' }} />
        <p className="text-[10px] font-mono tracking-[0.2em] text-zinc-400 uppercase">Próximas tareas</p>
      </div>

      <div className="p-3">
        {tasks.length === 0 ? (
          <p className="text-[10px] font-mono text-zinc-600 text-center py-6 uppercase tracking-wider">
            Sin tareas pendientes
          </p>
        ) : (
          <ul>
            {tasks.map((task, idx) => {
              const dueInfo = formatDueDate(task.due_date)
              const priority = priorityConfig[task.priority] || priorityConfig.medium
              const contactInfo = task.companies?.name || [task.contacts?.first_name, task.contacts?.last_name].filter(Boolean).join(' ')

              return (
                <li key={task.id} className={cn(idx > 0 && 'border-t border-white/5')}>
                  <Link
                    href="/tasks"
                    className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-white/3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-zinc-200 truncate">{task.title}</p>
                      {contactInfo && (
                        <p className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate">{contactInfo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm', priority.color)}>
                        {priority.label}
                      </span>
                      <div className={cn(
                        'flex items-center gap-0.5 text-[10px] font-mono font-medium',
                        dueInfo.isOverdue ? 'text-[#E31E24]' : dueInfo.isToday ? 'text-amber-400' : 'text-zinc-600'
                      )}>
                        {dueInfo.isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                        {dueInfo.isToday && <Calendar className="h-2.5 w-2.5" />}
                        {dueInfo.label}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <Link href="/tasks" className="block mt-2 text-[10px] font-mono text-zinc-600 hover:text-[#E31E24] text-center uppercase tracking-wider transition-colors pt-2 border-t border-white/5">
          Ver todas →
        </Link>
      </div>
    </div>
  )
}
