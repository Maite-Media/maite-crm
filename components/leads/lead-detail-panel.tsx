'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InterestBadge } from './interest-badge'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { LeadForm } from './lead-form'
import { deleteContact } from '@/lib/actions/leads'
import type { ContactWithRelations } from '@/lib/actions/leads'
import type { Activity } from '@/lib/actions/activities'
import type { Task } from '@/lib/actions/tasks'

interface LeadDetailPanelProps {
  contact: ContactWithRelations
  activities: Activity[]
  tasks: Task[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  onUpdated?: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SOURCE_LABELS: Record<string, string> = {
  web: 'Web', whatsapp: 'WhatsApp', linkedin: 'LinkedIn',
  referral: 'Referido', ad: 'Publicidad', call: 'Llamada', other: 'Otro',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-mono text-zinc-200 mt-0.5">{value}</p>
    </div>
  )
}

export function LeadDetailPanel({ contact, activities, tasks, open, onOpenChange, onDeleted, onUpdated }: LeadDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  const fullName = `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}`

  function handleDelete() {
    if (!confirm('¿Eliminar este lead?')) return
    startTransition(async () => {
      const result = await deleteContact(contact.id)
      if (result.success) { onDeleted?.(); onOpenChange(false) }
      else alert(result.error ?? 'Error al eliminar')
    })
  }

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="font-mono font-bold uppercase tracking-wider text-white">Editar Lead</DialogTitle>
            <DialogDescription className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Actualiza los datos del lead</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LeadForm contact={contact} onSuccess={() => { setIsEditing(false); onUpdated?.() }} onCancel={() => setIsEditing(false)} />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
        {/* Scan line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(227,30,36,0.5), transparent)' }} />

        <DialogHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <div className="w-0.5 h-5 bg-[#E31E24] mt-0.5 shrink-0" style={{ boxShadow: '0 0 6px rgba(227,30,36,0.5)' }} />
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-none mb-1">Lead</p>
                <DialogTitle className="text-base font-mono font-bold uppercase tracking-wider text-white leading-snug">{fullName}</DialogTitle>
                {contact.position && <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{contact.position}</p>}
                {contact.companies && <p className="text-[10px] font-mono text-zinc-500">{contact.companies.name}</p>}
              </div>
            </div>
            <InterestBadge level={contact.interest_level} />
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
              {contact.email && <Field label="Email" value={contact.email} />}
              {contact.phone && <Field label="Teléfono" value={contact.phone} />}
              {contact.whatsapp && <Field label="WhatsApp" value={contact.whatsapp} />}
              {contact.source && <Field label="Fuente" value={SOURCE_LABELS[contact.source] ?? contact.source} />}
              {contact.estimated_budget && <Field label="Presupuesto" value={`₲${contact.estimated_budget.toLocaleString()}`} />}
            </div>

            {contact.notes && (
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Notas</p>
                <p className="text-[11px] font-mono text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
              </div>
            )}

            <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Field label="Creado" value={formatDate(contact.created_at)} />
              {contact.profiles && <Field label="Responsable" value={contact.profiles.full_name} />}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed activities={activities} contactId={contact.id} />
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
            style={{ background: '#E31E24', borderRadius: '2px', boxShadow: isPending ? 'none' : '0 0 12px rgba(227,30,36,0.3)' }}
          >
            {isPending ? '...' : 'Eliminar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
