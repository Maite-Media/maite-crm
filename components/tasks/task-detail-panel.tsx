'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PriorityBadge } from './priority-badge'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { TaskForm } from './task-form'
import { completeTask, deleteTask } from '@/lib/actions/tasks'
import type { Task } from '@/lib/actions/tasks'

interface TaskWithRelations extends Task {
  profiles?: { full_name: string } | null
  contacts?: { first_name: string; last_name: string } | null
  companies?: { name: string } | null
  opportunities?: { title: string } | null
}

interface TaskDetailPanelProps {
  task: TaskWithRelations
  activities: Array<{ id: string; type: string; description: string; created_at: string; profiles?: { full_name: string } | null }>
  profiles?: Array<{ id: string; full_name: string }>
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  opportunities?: Array<{ id: string; title: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  onUpdated?: () => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date()
}

const STATUS_CONFIG: Record<string, { label: string; className: string; style: React.CSSProperties }> = {
  pending: { label: 'PENDIENTE', className: 'bg-zinc-800 text-zinc-400', style: { border: '1px solid rgba(113,113,122,0.4)' } },
  in_progress: { label: 'EN PROGRESO', className: 'bg-blue-900/30 text-blue-300', style: { border: '1px solid rgba(96,165,250,0.35)' } },
  done: { label: 'COMPLETADA', className: 'bg-green-900/30 text-green-400', style: { border: '1px solid rgba(34,197,94,0.35)', boxShadow: '0 0 6px rgba(34,197,94,0.1)' } },
  overdue: { label: 'VENCIDA', className: 'bg-[#E31E24]/10 text-[#E31E24]', style: { border: '1px solid rgba(227,30,36,0.35)' } },
}

function Field({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={`text-[11px] font-mono mt-0.5 ${highlight ? 'text-[#E31E24]' : 'text-zinc-200'}`}>{value}</p>
    </div>
  )
}

export function TaskDetailPanel({ task, activities, profiles = [], contacts = [], companies = [], opportunities = [], open, onOpenChange, onDeleted, onUpdated }: TaskDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleComplete() {
    startTransition(async () => {
      const result = await completeTask(task.id)
      if (result.success) onUpdated?.()
      else alert(result.error ?? 'Error al completar')
    })
  }

  function handleDelete() {
    if (!confirm('¿Eliminar esta tarea?')) return
    startTransition(async () => {
      const result = await deleteTask(task.id)
      if (result.success) { onDeleted?.(); onOpenChange(false) }
      else alert(result.error ?? 'Error al eliminar')
    })
  }

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="font-mono font-bold uppercase tracking-wider text-white">Editar Tarea</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <TaskForm task={task} profiles={profiles} contacts={contacts} companies={companies} opportunities={opportunities}
              onSuccess={() => { setIsEditing(false); onUpdated?.() }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const statusCfg = STATUS_CONFIG[isOverdue(task) ? 'overdue' : task.status] ?? STATUS_CONFIG.pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
        <div className="absolute top-0 left-1/4 right-1/4 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(227,30,36,0.5), transparent)' }} />

        <DialogHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="flex items-start gap-2">
              <div className="w-0.5 h-5 bg-[#E31E24] mt-0.5 shrink-0" style={{ boxShadow: '0 0 6px rgba(227,30,36,0.5)' }} />
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-none mb-1">Tarea</p>
                <DialogTitle className="text-base font-mono font-bold uppercase tracking-wider text-white leading-snug">{task.title}</DialogTitle>
              </div>
            </div>
            <PriorityBadge priority={task.priority} />
          </div>
          <div className="mt-2 pl-2.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm ${statusCfg.className}`} style={statusCfg.style}>
              {statusCfg.label}
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full font-mono">
            <TabsTrigger value="detail" className="flex-1 text-[10px] uppercase tracking-wider">Detalle</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-[10px] uppercase tracking-wider">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-3">
            {task.description && (
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Descripción</p>
                <p className="text-[11px] font-mono text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vencimiento" value={formatDate(task.due_date)} highlight={isOverdue(task)} />
              <Field label="Prioridad" value={(task.priority ?? '—').toUpperCase()} />
              {task.contacts && <Field label="Contacto" value={`${task.contacts.first_name} ${task.contacts.last_name ?? ''}`} />}
              {task.companies && <Field label="Empresa" value={task.companies.name} />}
              {task.opportunities && <Field label="Oportunidad" value={task.opportunities.title} />}
              {task.profiles && <Field label="Asignado a" value={task.profiles.full_name} />}
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Field label="Creado" value={formatDate(task.created_at)} />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed activities={activities as any} taskId={task.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {task.status !== 'done' && (
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-40 transition-all"
              style={{ background: 'rgba(34,197,94,0.9)', borderRadius: '2px', boxShadow: '0 0 10px rgba(34,197,94,0.25)' }}
            >
              {isPending ? '...' : 'Completar'}
            </button>
          )}
          <button
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', background: 'transparent' }}
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-40 transition-all"
            style={{ background: '#E31E24', borderRadius: '2px', boxShadow: '0 0 12px rgba(227,30,36,0.3)' }}
          >
            {isPending ? '...' : 'Eliminar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
