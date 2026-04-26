'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
  activities: Array<{
    id: string
    type: string
    description: string
    created_at: string
    profiles?: { full_name: string } | null
  }>
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
  if (!dateString) return 'Sin fecha'
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date()
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada',
  overdue: 'Vencida',
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  done: 'bg-green-100 text-green-700 border-green-300',
  overdue: 'bg-red-100 text-red-700 border-red-300',
}

export function TaskDetailPanel({
  task,
  activities,
  profiles = [],
  contacts = [],
  companies = [],
  opportunities = [],
  open,
  onOpenChange,
  onDeleted,
  onUpdated,
}: TaskDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleComplete() {
    startTransition(async () => {
      const result = await completeTask(task.id)
      if (result.success) {
        onUpdated?.()
      } else {
        alert(result.error ?? 'Error al completar')
      }
    })
  }

  function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return

    startTransition(async () => {
      const result = await deleteTask(task.id)
      if (result.success) {
        onDeleted?.()
        onOpenChange(false)
      } else {
        alert(result.error ?? 'Error al eliminar')
      }
    })
  }

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Tarea</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <TaskForm
              task={task}
              profiles={profiles}
              contacts={contacts}
              companies={companies}
              opportunities={opportunities}
              onSuccess={() => {
                setIsEditing(false)
                onUpdated?.()
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
            <DialogTitle className="text-xl leading-tight">{task.title}</DialogTitle>
            <PriorityBadge priority={task.priority} />
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_BADGE_CLASSES[task.status] ?? ''}`}>
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
        </DialogHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="detail" className="flex-1">Detalle</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-4">
            {task.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Vencimiento</p>
                <p className={`text-sm ${isOverdue(task) ? 'text-destructive font-medium' : ''}`}>
                  {formatDate(task.due_date)}
                  {isOverdue(task) && ' (Vencida)'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Prioridad</p>
                <p className="text-sm">{task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '-'}</p>
              </div>
            </div>

            <Separator />

            {task.contacts && (
              <div>
                <p className="text-xs text-muted-foreground">Contacto</p>
                <p className="text-sm">
                  {task.contacts.first_name} {task.contacts.last_name ?? ''}
                </p>
              </div>
            )}

            {task.companies && (
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm">{task.companies.name}</p>
              </div>
            )}

            {task.opportunities && (
              <div>
                <p className="text-xs text-muted-foreground">Oportunidad</p>
                <p className="text-sm">{task.opportunities.title}</p>
              </div>
            )}

            {task.profiles && (
              <div>
                <p className="text-xs text-muted-foreground">Asignado a</p>
                <p className="text-sm">{task.profiles.full_name}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Información</p>
              <p className="text-sm">Creado: {formatDate(task.created_at)}</p>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed
              activities={activities as any}
              taskId={task.id}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-4 border-t">
          {task.status !== 'done' && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleComplete}
              disabled={isPending}
            >
              {isPending ? 'Completando...' : 'Marcar como completada'}
            </Button>
          )}
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
