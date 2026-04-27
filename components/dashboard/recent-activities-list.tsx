'use client'

import Link from 'next/link'
import type { Activity, ActivityType } from '@/lib/actions/activities'

interface RecentActivitiesListProps {
  activities: Activity[]
}

const typeIcon: Record<ActivityType, string> = {
  note: '📝', call: '📞', email: '📧', whatsapp: '💬',
  meeting: '👥', stage_change: '🔄', task_created: '✅',
  proposal_sent: '📄', system: '⚙️',
}

const typeLabel: Record<ActivityType, string> = {
  note: 'NOTA', call: 'CALL', email: 'MAIL', whatsapp: 'WA',
  meeting: 'MTG', stage_change: 'ETAPA', task_created: 'TASK',
  proposal_sent: 'PDF', system: 'SYS',
}

function relativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const m = Math.floor(diffMs / 60000)
  const h = Math.floor(diffMs / 3600000)
  const d = Math.floor(diffMs / 86400000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 7) return `${d}d`
  return new Date(dateString).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })
}

export function RecentActivitiesList({ activities }: RecentActivitiesListProps) {
  function getEntity(activity: Activity): { label: string; href: string } | null {
    if (activity.contact_id && activity.contacts) {
      return { label: `${activity.contacts.first_name}${activity.contacts.last_name ? ` ${activity.contacts.last_name}` : ''}`, href: `/leads?open=${activity.contact_id}` }
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
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/50 z-10" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/50 z-10" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/50 z-10" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/50 z-10" />

      <div className="px-4 pt-3.5 pb-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 5px #22c55e' }} />
        <p className="text-[10px] font-mono tracking-[0.2em] text-zinc-400 uppercase flex-1">Actividad reciente</p>
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Live</span>
      </div>

      <div className="py-1">
        {activities.length === 0 ? (
          <p className="text-[10px] font-mono text-zinc-600 text-center py-4 uppercase tracking-wider">Sin actividades</p>
        ) : (
          activities.map((activity, idx) => {
            const entity = getEntity(activity)
            return (
              <div
                key={activity.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/3 transition-colors"
                style={idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.04)' } : undefined}
              >
                <span className="text-xs shrink-0 w-4">{typeIcon[activity.type] || '📌'}</span>
                <span className="text-[9px] font-mono text-zinc-700 bg-zinc-800/60 px-1 py-0.5 rounded-sm shrink-0 w-10 text-center">
                  {typeLabel[activity.type] || 'LOG'}
                </span>
                <p className="text-[11px] font-mono text-zinc-400 flex-1 truncate min-w-0">{activity.description}</p>
                {entity && (
                  <Link
                    href={entity.href}
                    className="text-[9px] font-mono text-[#E31E24]/70 hover:text-[#E31E24] transition-colors shrink-0 max-w-[72px] truncate"
                  >
                    {entity.label}
                  </Link>
                )}
                <span className="text-[9px] font-mono text-zinc-700 shrink-0 w-7 text-right">{relativeTime(activity.created_at)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
