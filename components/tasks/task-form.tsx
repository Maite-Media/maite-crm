'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createTask, updateTask } from '@/lib/actions/tasks'
import type { Task } from '@/lib/actions/tasks'

interface TaskFormProps {
  task?: Task
  profiles?: Array<{ id: string; full_name: string }>
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  opportunities?: Array<{ id: string; title: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function TaskForm({ task, profiles = [], contacts = [], companies = [], opportunities = [], onSuccess, onCancel }: TaskFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.split('T')[0] : ''
  )
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [status, setStatus] = useState(task?.status ?? 'pending')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [contactId, setContactId] = useState(task?.contact_id ?? '')
  const [companyId, setCompanyId] = useState(task?.company_id ?? '')
  const [opportunityId, setOpportunityId] = useState(task?.opportunity_id ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('El título es requerido')
      return
    }

    startTransition(async () => {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority: priority || undefined,
        status: status || undefined,
        assigned_to: assignedTo || undefined,
        contact_id: contactId || undefined,
        company_id: companyId || undefined,
        opportunity_id: opportunityId || undefined,
      }

      const result = task
        ? await updateTask(task.id, data as Partial<Task>)
        : await createTask(data as Parameters<typeof createTask>[0])

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
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Llamar al lead"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles de la tarea..."
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base min-h-[80px]"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="due_date">Fecha de vencimiento</Label>
          <Input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="priority">Prioridad</Label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base"
            disabled={isPending}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
      </div>

      {task && (
        <div className="space-y-1">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'pending' | 'in_progress' | 'done' | 'overdue')}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base"
            disabled={isPending}
          >
            <option value="pending">Pendiente</option>
            <option value="in_progress">En progreso</option>
            <option value="done">Completada</option>
            <option value="overdue">Vencida</option>
          </select>
        </div>
      )}

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
            <option key={c.id} value={c.id}>{c.first_name}{c.last_name ? ` ${c.last_name}` : ''}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="opportunity_id">Oportunidad</Label>
        <select
          id="opportunity_id"
          value={opportunityId}
          onChange={(e) => setOpportunityId(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
          disabled={isPending}
        >
          <option value="">Sin oportunidad</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
      </div>

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

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : task ? 'Actualizar' : 'Crear Tarea'}
        </Button>
      </div>
    </form>
  )
}
