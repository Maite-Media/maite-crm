'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ProjectForm } from './project-form'
import { updateProject, deleteProject } from '@/lib/actions/projects'
import type { ProjectWithRelations } from '@/lib/actions/projects'

const STATUS_LABELS: Record<string, string> = {
  pending_onboarding: 'Pendiente onboarding',
  waiting_materials: 'Esperando materiales',
  in_production: 'En producción',
  in_review: 'En revisión',
  delivered: 'Entregado',
  completed: 'Completado',
  in_maintenance: 'En mantenimiento',
}

const STATUS_COLORS: Record<string, { className: string; style: React.CSSProperties }> = {
  pending_onboarding: { className: 'bg-zinc-800 text-zinc-400', style: { border: '1px solid rgba(113,113,122,0.4)' } },
  waiting_materials: { className: 'bg-amber-900/20 text-amber-400', style: { border: '1px solid rgba(217,119,6,0.35)' } },
  in_production: { className: 'bg-blue-900/30 text-blue-300', style: { border: '1px solid rgba(96,165,250,0.35)' } },
  in_review: { className: 'bg-orange-900/20 text-orange-400', style: { border: '1px solid rgba(251,146,60,0.35)' } },
  delivered: { className: 'bg-green-900/30 text-green-400', style: { border: '1px solid rgba(34,197,94,0.35)' } },
  completed: { className: 'bg-green-900/40 text-green-300', style: { border: '1px solid rgba(34,197,94,0.5)', boxShadow: '0 0 6px rgba(34,197,94,0.1)' } },
  in_maintenance: { className: 'bg-purple-900/30 text-purple-300', style: { border: '1px solid rgba(167,139,250,0.35)' } },
}

const STATUS_OPTIONS = [
  { value: 'pending_onboarding', label: 'Pendiente onboarding' },
  { value: 'waiting_materials', label: 'Esperando materiales' },
  { value: 'in_production', label: 'En producción' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'completed', label: 'Completado' },
  { value: 'in_maintenance', label: 'En mantenimiento' },
]

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-mono text-zinc-200 mt-0.5">{value}</p>
    </div>
  )
}

interface ProjectDetailPanelProps {
  project: ProjectWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  profiles?: Array<{ id: string; full_name: string }>
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  onUpdated?: (project: ProjectWithRelations) => void
  onDeleted?: (id: string) => void
}

export function ProjectDetailPanel({ project, open, onOpenChange, profiles = [], contacts = [], companies = [], onUpdated, onDeleted }: ProjectDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleStatusChange(newStatus: string) {
    if (!project) return
    startTransition(async () => {
      const result = await updateProject(project.id, { status: newStatus as ProjectWithRelations['status'] })
      if (result.success && result.data) {
        onUpdated?.({ ...project, ...result.data, status: newStatus as ProjectWithRelations['status'] } as ProjectWithRelations)
      } else {
        alert(result.error ?? 'Error al actualizar')
      }
    })
  }

  function handleDelete() {
    if (!project || !confirm('¿Eliminar este proyecto?')) return
    startTransition(async () => {
      const result = await deleteProject(project.id)
      if (result.success) { onDeleted?.(project.id); onOpenChange(false) }
      else alert(result.error ?? 'Error al eliminar')
    })
  }

  if (!project) return null

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="font-mono font-bold uppercase tracking-wider text-white">Editar Proyecto</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ProjectForm project={project} profiles={profiles} contacts={contacts} companies={companies}
              onSuccess={() => { setIsEditing(false); onUpdated?.(project) }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const statusCfg = STATUS_COLORS[project.status] ?? STATUS_COLORS.pending_onboarding

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
        <div className="absolute top-0 left-1/4 right-1/4 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(227,30,36,0.5), transparent)' }} />

        <DialogHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start gap-2">
            <div className="w-0.5 h-5 bg-[#E31E24] mt-0.5 shrink-0" style={{ boxShadow: '0 0 6px rgba(227,30,36,0.5)' }} />
            <div className="flex-1">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-none mb-1">Proyecto</p>
              <DialogTitle className="text-base font-mono font-bold uppercase tracking-wider text-white leading-snug">{project.name}</DialogTitle>
            </div>
          </div>
          <div className="mt-3">
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isPending}
              className={`inline-flex items-center px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm cursor-pointer outline-none ${statusCfg.className}`}
              style={{ ...statusCfg.style, background: 'transparent' }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: '#111', color: '#f0f0f0' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {project.companies && <Field label="Empresa" value={project.companies.name} />}
            {project.contacts && <Field label="Contacto" value={`${project.contacts.first_name} ${project.contacts.last_name ?? ''}`} />}
            <Field label="Inicio" value={formatDate(project.start_date)} />
            <Field label="Fin estimado" value={formatDate(project.estimated_end_date)} />
            {project.profiles && <Field label="Asignado a" value={project.profiles.full_name} />}
            {project.services && <Field label="Servicio" value={project.services.name} />}
            {project.opportunities && <Field label="Oportunidad" value={project.opportunities.title} />}
          </div>

          {project.notes && (
            <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Notas</p>
              <p className="text-[11px] font-mono text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed">{project.notes}</p>
            </div>
          )}

          <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Field label="Creado" value={formatDate(project.created_at)} />
            <Field label="Actualizado" value={formatDate(project.updated_at)} />
            {project.created_by_profile && <Field label="Creado por" value={project.created_by_profile.full_name} />}
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
