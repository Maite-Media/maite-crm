'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createProject, updateProject } from '@/lib/actions/projects'
import type { ProjectWithRelations, Project } from '@/lib/actions/projects'

const STATUS_OPTIONS = [
  { value: 'pending_onboarding', label: 'Pendiente onboarding' },
  { value: 'waiting_materials', label: 'Esperando materiales' },
  { value: 'in_production', label: 'En producción' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'completed', label: 'Completado' },
  { value: 'in_maintenance', label: 'En mantenimiento' },
]

interface ProjectFormProps {
  project?: ProjectWithRelations
  profiles?: Array<{ id: string; full_name: string }>
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProjectForm({
  project,
  profiles = [],
  contacts = [],
  companies = [],
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(project?.name ?? '')
  const [companyId, setCompanyId] = useState(project?.company_id ?? '')
  const [contactId, setContactId] = useState(project?.contact_id ?? '')
  const [startDate, setStartDate] = useState(project?.start_date?.split('T')[0] ?? '')
  const [estimatedEndDate, setEstimatedEndDate] = useState(project?.estimated_end_date?.split('T')[0] ?? '')
  const [assignedTo, setAssignedTo] = useState(project?.assigned_to ?? '')
  const [status, setStatus] = useState(project?.status ?? 'pending_onboarding')
  const [notes, setNotes] = useState(project?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    startTransition(async () => {
      const data = {
        name: name.trim(),
        company_id: companyId || undefined,
        contact_id: contactId || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        estimated_end_date: estimatedEndDate ? new Date(estimatedEndDate).toISOString() : undefined,
        assigned_to: assignedTo || undefined,
        status: status as Project['status'],
        notes: notes.trim() || undefined,
      }

      const result = project
        ? await updateProject(project.id, data)
        : await createProject(data as Parameters<typeof createProject>[0])

      if (!result.success) {
        setError(result.error ?? 'Error desconocido')
        return
      }

      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del proyecto"
          required
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="company_id">Empresa</Label>
          <select
            id="company_id"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
            disabled={isPending}
          >
            <option value="">Sin empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="contact_id">Contacto</Label>
          <select
            id="contact_id"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
            disabled={isPending}
          >
            <option value="">Sin contacto</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name}{c.last_name ? ` ${c.last_name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="start_date">Fecha de inicio</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="estimated_end_date">Fecha estimada de fin</Label>
          <Input
            id="estimated_end_date"
            type="date"
            value={estimatedEndDate}
            onChange={(e) => setEstimatedEndDate(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="assigned_to">Asignado a</Label>
          <select
            id="assigned_to"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
            disabled={isPending}
          >
            <option value="">Sin asignar</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
            disabled={isPending}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas sobre el proyecto..."
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]"
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : project ? 'Actualizar' : 'Crear Proyecto'}
        </Button>
      </div>
    </form>
  )
}