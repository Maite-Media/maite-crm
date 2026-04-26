'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { InterestBadge } from './interest-badge'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { LeadForm } from './lead-form'
import { deleteContact } from '@/lib/actions/leads'
import { getActivitiesByContact } from '@/lib/actions/activities'
import { getTasksByContact } from '@/lib/actions/tasks'
import type { Contact, ContactWithRelations } from '@/lib/actions/leads'
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
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SOURCE_LABELS: Record<string, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  referral: 'Referido',
  ad: 'Publicidad',
  call: 'Llamada',
  other: 'Otro',
}

export function LeadDetailPanel({
  contact,
  activities,
  tasks,
  open,
  onOpenChange,
  onDeleted,
  onUpdated,
}: LeadDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  const fullName = `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}`

  function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este lead?')) return

    startTransition(async () => {
      const result = await deleteContact(contact.id)
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Lead</SheetTitle>
            <SheetDescription>
              Actualiza los datos del lead
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <LeadForm
              contact={contact}
              onSuccess={() => {
                setIsEditing(false)
                onUpdated?.()
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{fullName}</SheetTitle>
              {contact.position && (
                <p className="text-sm text-muted-foreground mt-1">
                  {contact.position}
                </p>
              )}
            </div>
            <InterestBadge level={contact.interest_level} />
          </div>
          {contact.companies && (
            <p className="text-sm text-muted-foreground mt-1">
              {contact.companies.name}
            </p>
          )}
        </SheetHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="detail" className="flex-1">Detalle</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Actividad</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">Tareas</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {contact.email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{contact.email}</p>
                </div>
              )}
              {contact.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm">{contact.phone}</p>
                </div>
              )}
              {contact.whatsapp && (
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="text-sm">{contact.whatsapp}</p>
                </div>
              )}
              {contact.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Fuente</p>
                  <p className="text-sm">{SOURCE_LABELS[contact.source] ?? contact.source}</p>
                </div>
              )}
              {contact.estimated_budget && (
                <div>
                  <p className="text-xs text-muted-foreground">Presupuesto</p>
                  <p className="text-sm">₲{contact.estimated_budget.toLocaleString()}</p>
                </div>
              )}
            </div>

            {contact.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">Información</p>
              <p className="text-sm">Creado: {formatDate(contact.created_at)}</p>
              {contact.profiles && (
                <p className="text-sm">Responsable: {contact.profiles.full_name}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
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
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed
              activities={activities}
              contactId={contact.id}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin tareas asociadas
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border bg-card text-card-foreground"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.due_date ? `Vence: ${formatDate(task.due_date)}` : 'Sin fecha'}
                      {' • '}
                      {task.status === 'done' ? 'Completada' : task.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}