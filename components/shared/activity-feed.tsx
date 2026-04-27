'use client'

import { useState, useTransition } from 'react'
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
  note: '📝', call: '📞', email: '📧', whatsapp: '💬',
  meeting: '👥', stage_change: '🔄', task_created: '✅',
  proposal_sent: '📄', system: '⚙️',
}

const typeLabel: Record<ActivityType, string> = {
  note: 'NOTA', call: 'CALL', email: 'MAIL', whatsapp: 'WA',
  meeting: 'MTG', stage_change: 'ETAPA', task_created: 'TASK',
  proposal_sent: 'PDF', system: 'SYS',
}

function formatRelativeTime(dateString: string): string {
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

export function ActivityFeed({ activities, contactId, opportunityId, companyId }: ActivityFeedProps) {
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
    <div className="space-y-3">
      {/* Add note */}
      <form onSubmit={handleAddNote} className="space-y-2">
        <textarea
          placeholder="› agregar nota..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          rows={2}
          className="w-full px-3 py-2 text-[11px] font-mono text-zinc-300 placeholder:text-zinc-700 resize-none outline-none focus:ring-0 transition-colors"
          style={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '2px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(227,30,36,0.3)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !note.trim()}
            className="px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#E31E24', borderRadius: '2px' }}
          >
            {isPending ? '...' : 'Agregar nota'}
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className="space-y-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {activities.length === 0 ? (
          <p className="text-[10px] font-mono text-zinc-700 text-center py-4 uppercase tracking-wider">
            Sin actividades
          </p>
        ) : (
          activities.map((activity, idx) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 py-2 hover:bg-white/3 transition-colors"
              style={idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.04)' } : undefined}
            >
              <span className="text-xs shrink-0 mt-0.5">{activityIcons[activity.type] || '📌'}</span>
              <span className="text-[9px] font-mono text-zinc-700 bg-zinc-800/60 px-1 py-0.5 rounded-sm shrink-0 w-10 text-center mt-0.5">
                {typeLabel[activity.type] || 'LOG'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-zinc-300 leading-snug">{activity.description}</p>
                <p className="text-[9px] font-mono text-zinc-600 mt-0.5">
                  {activity.profiles?.full_name || 'sistema'} · {formatRelativeTime(activity.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
