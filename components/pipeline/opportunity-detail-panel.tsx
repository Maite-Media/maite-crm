'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { OpportunityForm } from './opportunity-form'
import { ProposalButton } from './proposal-button'
import { updateOpportunity } from '@/lib/actions/opportunities'
import { getActivitiesByOpportunity } from '@/lib/actions/activities'
import { getTasksByOpportunity } from '@/lib/actions/tasks'
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
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return `₲${value.toLocaleString('es-PY')}`
}

export function OpportunityDetailPanel({
  opportunity,
  activities,
  tasks,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  contacts = [],
  companies = [],
  services = [],
  stages = [],
}: OpportunityDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar esta oportunidad?')) return
    onDeleted?.()
    onOpenChange(false)
  }

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Oportunidad</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la oportunidad
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <OpportunityForm
              opportunity={opportunity}
              contacts={contacts}
              companies={companies}
              services={services}
              stages={stages}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-xl">{opportunity.title}</DialogTitle>
            {opportunity.pipeline_stages && (
              <Badge
                style={{ backgroundColor: opportunity.pipeline_stages.color + '20', color: opportunity.pipeline_stages.color }}
              >
                {opportunity.pipeline_stages.name}
              </Badge>
            )}
          </div>
          {opportunity.companies && (
            <p className="text-sm text-muted-foreground mt-1">
              {opportunity.companies.name}
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="detail" className="flex-1">Detalle</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Actividad</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">Tareas</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {opportunity.estimated_value && (
                <div>
                  <p className="text-xs text-muted-foreground">Valor estimado</p>
                  <p className="text-sm font-semibold">{formatCurrency(opportunity.estimated_value)}</p>
                </div>
              )}
              {opportunity.close_probability !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Probabilidad</p>
                  <p className="text-sm">{opportunity.close_probability}%</p>
                </div>
              )}
              {opportunity.expected_close_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de cierre</p>
                  <p className="text-sm">{formatDate(opportunity.expected_close_date)}</p>
                </div>
              )}
              {opportunity.services && opportunity.services.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Servicio</p>
                  <p className="text-sm">{opportunity.services.map(s => s.name).join(', ')}</p>
                </div>
              )}
            </div>

            {opportunity.contacts && (
              <div>
                <p className="text-xs text-muted-foreground">Contacto</p>
                <p className="text-sm">
                  {opportunity.contacts.first_name}
                  {opportunity.contacts.last_name ? ` ${opportunity.contacts.last_name}` : ''}
                </p>
              </div>
            )}

            {opportunity.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{opportunity.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">Información</p>
              <p className="text-sm">Creado: {formatDate(opportunity.created_at)}</p>
              {opportunity.profiles && (
                <p className="text-sm">Responsable: {opportunity.profiles.full_name}</p>
              )}
            </div>

            <div className="pt-2">
              <ProposalButton
                opportunityId={opportunity.id}
                companyName={opportunity.companies?.name}
              />
            </div>

            <DialogFooter className="flex gap-2 pt-4 border-t">
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
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed
              activities={activities}
              opportunityId={opportunity.id}
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
      </DialogContent>
    </Dialog>
  )
}