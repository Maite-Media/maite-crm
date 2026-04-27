'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { OpportunityForm } from './opportunity-form'
import { ProposalButton } from './proposal-button'
import type { OpportunityWithRelations } from '@/lib/actions/opportunities'
import type { Activity } from '@/lib/actions/activities'
import type { Task } from '@/lib/actions/tasks'

interface OpportunityDetailPanelProps {
  opportunity: OpportunityWithRelations
  activities: Activity[]
  tasks: Task[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  services?: Array<{ id: string; name: string }>
  stages?: Array<{ id: string; name: string }>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(value: number | null): string {
  if (!value) return '—'
  return `₲${value.toLocaleString('es-PY')}`
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-mono text-zinc-200 mt-0.5">{value}</p>
    </div>
  )
}

export function OpportunityDetailPanel({
  opportunity, activities, tasks, open, onOpenChange, onUpdated, onDeleted,
  contacts = [], companies = [], services = [], stages = [],
}: OpportunityDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleDelete() {
    if (!confirm('¿Eliminar esta oportunidad?')) return
    onDeleted?.()
    onOpenChange(false)
  }

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="font-mono font-bold uppercase tracking-wider text-white">Editar Oportunidad</DialogTitle>
            <DialogDescription className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Actualiza los datos de la oportunidad</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <OpportunityForm
              opportunity={opportunity} contacts={contacts} companies={companies}
              services={services} stages={stages}
              onSuccess={() => { setIsEditing(false); onUpdated?.() }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
        <div className="absolute top-0 left-1/4 right-1/4 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(227,30,36,0.5), transparent)' }} />

        <DialogHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <div className="w-0.5 h-5 bg-[#E31E24] mt-0.5 shrink-0" style={{ boxShadow: '0 0 6px rgba(227,30,36,0.5)' }} />
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-none mb-1">Oportunidad</p>
                <DialogTitle className="text-base font-mono font-bold uppercase tracking-wider text-white leading-snug">{opportunity.title}</DialogTitle>
                {opportunity.companies && <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{opportunity.companies.name}</p>}
              </div>
            </div>
            {opportunity.pipeline_stages && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm shrink-0"
                style={{
                  background: `${opportunity.pipeline_stages.color}15`,
                  color: opportunity.pipeline_stages.color,
                  border: `1px solid ${opportunity.pipeline_stages.color}40`,
                }}
              >
                {opportunity.pipeline_stages.name}
              </span>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full font-mono">
            <TabsTrigger value="detail" className="flex-1 text-[10px] uppercase tracking-wider">Detalle</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-[10px] uppercase tracking-wider">Actividad</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 text-[10px] uppercase tracking-wider">Tareas</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {opportunity.estimated_value && (
                <Field label="Valor estimado" value={
                  <span className="text-[13px] font-mono font-bold text-white" style={{ textShadow: '0 0 12px rgba(227,30,36,0.3)' }}>
                    {formatCurrency(opportunity.estimated_value)}
                  </span>
                } />
              )}
              {opportunity.close_probability !== null && <Field label="Probabilidad" value={`${opportunity.close_probability}%`} />}
              {opportunity.expected_close_date && <Field label="Cierre esperado" value={formatDate(opportunity.expected_close_date)} />}
              {opportunity.services && opportunity.services.length > 0 && (
                <Field label="Servicio" value={opportunity.services.map(s => s.name).join(', ')} />
              )}
            </div>

            {opportunity.contacts && (
              <Field label="Contacto" value={`${opportunity.contacts.first_name}${opportunity.contacts.last_name ? ` ${opportunity.contacts.last_name}` : ''}`} />
            )}

            {opportunity.notes && (
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Notas</p>
                <p className="text-[11px] font-mono text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed">{opportunity.notes}</p>
              </div>
            )}

            <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Field label="Creado" value={formatDate(opportunity.created_at)} />
              {opportunity.profiles && <Field label="Responsable" value={opportunity.profiles.full_name} />}
            </div>

            <div className="pt-2">
              <ProposalButton opportunityId={opportunity.id} companyName={opportunity.companies?.name} />
            </div>

            <DialogFooter className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setIsEditing(true)}
                disabled={isPending}
                className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 transition-colors hover:text-white disabled:opacity-40"
                style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', background: 'transparent' }}
              >
                Editar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: '#E31E24', borderRadius: '2px', boxShadow: '0 0 12px rgba(227,30,36,0.3)' }}
              >
                Eliminar
              </button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed activities={activities} opportunityId={opportunity.id} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            {tasks.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-700 text-center py-4 uppercase tracking-wider">Sin tareas</p>
            ) : (
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <p className="text-[11px] font-mono text-zinc-200">{task.title}</p>
                    <p className="text-[9px] font-mono text-zinc-600 shrink-0">
                      {task.due_date ? formatDate(task.due_date) : 'Sin fecha'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
