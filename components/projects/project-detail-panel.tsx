'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

const STATUS_COLORS: Record<string, string> = {
  pending_onboarding: 'bg-gray-100 text-gray-700 border-gray-300',
  waiting_materials: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  in_production: 'bg-blue-100 text-blue-700 border-blue-300',
  in_review: 'bg-orange-100 text-orange-700 border-orange-300',
  delivered: 'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-green-200 text-green-800 border-green-400',
  in_maintenance: 'bg-purple-100 text-purple-700 border-purple-300',
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
  if (!dateString) return 'Sin fecha'
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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

export function ProjectDetailPanel({
  project,
  open,
  onOpenChange,
  profiles = [],
  contacts = [],
  companies = [],
  onUpdated,
  onDeleted,
}: ProjectDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleStatusChange(newStatus: string) {
    if (!project) return

    startTransition(async () => {
      const result = await updateProject(project.id, { status: newStatus as ProjectWithRelations['status'] })
      if (result.success && result.data) {
        onUpdated?.({
          ...project,
          ...result.data,
          status: newStatus as ProjectWithRelations['status'],
        } as ProjectWithRelations)
      } else {
        alert(result.error ?? 'Error al actualizar')
      }
    })
  }

  function handleDelete() {
    if (!project || !confirm('¿Estás seguro de eliminar este proyecto?')) return

    startTransition(async () => {
      const result = await deleteProject(project.id)
      if (result.success) {
        onDeleted?.(project.id)
        onOpenChange(false)
      } else {
        alert(result.error ?? 'Error al eliminar')
      }
    })
  }

  if (!project) return null

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Proyecto</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ProjectForm
              project={project}
              profiles={profiles}
              contacts={contacts}
              companies={companies}
              onSuccess={() => {
                setIsEditing(false)
                onUpdated?.(project)
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-2 pr-6">
            <DialogTitle className="text-xl leading-tight">{project.name}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border ${STATUS_COLORS[project.status] ?? ''}`}
              disabled={isPending}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {project.companies && (
            <div>
              <p className="text-xs text-muted-foreground">Empresa</p>
              <p className="text-sm">{project.companies.name}</p>
            </div>
          )}

          {project.contacts && (
            <div>
              <p className="text-xs text-muted-foreground">Contacto</p>
              <p className="text-sm">
                {project.contacts.first_name} {project.contacts.last_name ?? ''}
              </p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Fecha de inicio</p>
              <p className="text-sm">{formatDate(project.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha estimada de fin</p>
              <p className="text-sm">{formatDate(project.estimated_end_date)}</p>
            </div>
          </div>

          {project.profiles && (
            <div>
              <p className="text-xs text-muted-foreground">Asignado a</p>
              <p className="text-sm">{project.profiles.full_name}</p>
            </div>
          )}

          {project.services && (
            <div>
              <p className="text-xs text-muted-foreground">Servicio</p>
              <p className="text-sm">{project.services.name}</p>
            </div>
          )}

          {project.opportunities && (
            <div>
              <p className="text-xs text-muted-foreground">Oportunidad</p>
              <p className="text-sm">{project.opportunities.title}</p>
            </div>
          )}

          {project.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Información</p>
            <p className="text-sm">Creado: {formatDate(project.created_at)}</p>
            <p className="text-sm">Actualizado: {formatDate(project.updated_at)}</p>
            {project.created_by_profile && (
              <p className="text-sm">Creado por: {project.created_by_profile.full_name}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
          >
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}