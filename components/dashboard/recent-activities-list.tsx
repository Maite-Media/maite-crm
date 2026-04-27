'use client'

import Link from 'next/link'
import type { Activity, ActivityType } from '@/lib/actions/activities'

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

const activityLabels: Record<ActivityType, string> = {
  note: 'NOTA',
  call: 'LLAMADA',
  email: 'EMAIL',
  whatsapp: 'WHATSAPP',
  meeting: 'REUNIÓN',
  stage_change: 'ETAPA',
  task_created: 'TAREA',
  proposal_sent: 'PROPUESTA',
  system: 'SISTEMA',
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'AHORA'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }).toUpperCase()
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
    <div className="relative bg-[#111111] border border-white/5 rounded-sm overflow-hidden">
      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/50 z-10" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/50 z-10" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/50 z-10" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/50 z-10" />

      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-sm" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
        <p className="text-[10px] font-mono tracking-[0.2em] text-zinc-400 uppercase">Actividades recientes</p>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-zinc-600 uppercase">Live</span>
        </div>
      </div>

      <div className="p-3">
        {activities.length === 0 ? (
          <p className="text-[10px] font-mono text-zinc-600 text-center py-6 uppercase tracking-wider">
            Sin actividades
          </p>
        ) : (
          <ul>
            {activities.map((activity, idx) => {
              const entityInfo = getEntityInfo(activity)
              const userName = activity.profiles?.full_name
              const isSystem = !userName || activity.type === 'system'

              return (
                <li key={activity.id} className={`flex gap-3 py-2.5 px-1 ${idx > 0 ? 'border-t border-white/5' : ''}`}>
                  <span className="text-sm shrink-0 mt-0.5">{activityIcons[activity.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-mono text-zinc-600 bg-zinc-800 px-1 py-0.5 rounded-sm mr-1.5">
                          {activityLabels[activity.type] || 'LOG'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-300">
                          {activity.description}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {entityInfo && (
                        <Link
                          href={entityInfo.href}
                          className="text-[9px] font-mono text-[#E31E24] bg-[#E31E24]/10 hover:bg-[#E31E24]/20 px-1.5 py-0.5 rounded-sm transition-colors uppercase tracking-wide"
                        >
                          {entityInfo.label}
                        </Link>
                      )}
                      <span className="text-[9px] font-mono text-zinc-600">
                        {isSystem ? '⚙ SISTEMA' : `› ${userName}`}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
