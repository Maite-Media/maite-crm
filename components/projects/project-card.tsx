'use client'

import { memo } from 'react'
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

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface ProjectCardProps {
  project: ProjectWithRelations
  onClick: () => void
}

export const ProjectCard = memo(function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[project.status] ?? ''}`}>
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>

        {project.companies && (
          <p className="text-sm text-muted-foreground">{project.companies.name}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Inicio: </span>
            <span>{formatDate(project.start_date)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Fin: </span>
            <span>{formatDate(project.estimated_end_date)}</span>
          </div>
        </div>

        {project.profiles && (
          <p className="text-xs text-muted-foreground">
            Asignado: {project.profiles.full_name}
          </p>
        )}
      </div>
    </div>
  )
})