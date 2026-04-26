'use client'

import React, { useState, useTransition, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { OpportunityCard } from './opportunity-card'
import { OpportunityForm } from './opportunity-form'
import { moveStage } from '@/lib/actions/opportunities'
import type { OpportunityWithRelations } from '@/lib/actions/opportunities'
import type { PipelineStage } from './types'

interface KanbanBoardProps {
  stages: PipelineStage[]
  opportunities: OpportunityWithRelations[]
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  services?: Array<{ id: string; name: string }>
  onRefresh?: () => void
}

interface StageColumnProps {
  stage: PipelineStage
  opportunities: OpportunityWithRelations[]
  isDropDisabled: boolean
  onCardClick: (opportunity: OpportunityWithRelations) => void
  onAddOpportunity: (stageId: string) => void
}

const StageColumn = React.memo(function StageColumn({
  stage,
  opportunities,
  isDropDisabled,
  onCardClick,
  onAddOpportunity,
}: StageColumnProps) {
  const {
    setNodeRef,
    over,
    isOver,
  } = useSortable({
    id: stage.id,
    data: { type: 'column', stage },
    disabled: isDropDisabled,
  })

  const stageOpportunities = opportunities.filter((opp) => opp.stage_id === stage.id)
  const isOverFinalColumn = isOver && (stage.is_won || stage.is_lost)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 min-w-[288px] bg-muted/30 rounded-lg',
        isOver && !isDropDisabled && 'bg-primary/5',
        isOverFinalColumn && 'opacity-50'
      )}
    >
      <CardHeader className="pb-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {stageOpportunities.length}
          </span>
        </div>
      </CardHeader>

      <div className="flex-1 p-2 space-y-2 min-h-[200px]">
        <SortableContext
          items={stageOpportunities.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {stageOpportunities.map((opportunity) => (
            <SortableOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              stage={stage}
              onClick={() => onCardClick(opportunity)}
            />
          ))}
        </SortableContext>

        {stageOpportunities.length === 0 && (
          <div className="h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">
            Sin oportunidades
          </div>
        )}
      </div>

      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => onAddOpportunity(stage.id)}
        >
          + Nueva oportunidad
        </Button>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.stage.id === nextProps.stage.id &&
    prevProps.stage.name === nextProps.stage.name &&
    prevProps.stage.color === nextProps.stage.color &&
    prevProps.stage.is_won === nextProps.stage.is_won &&
    prevProps.stage.is_lost === nextProps.stage.is_lost &&
    prevProps.isDropDisabled === nextProps.isDropDisabled &&
    prevProps.onCardClick === nextProps.onCardClick &&
    prevProps.onAddOpportunity === nextProps.onAddOpportunity
  )
})

interface SortableOpportunityCardProps {
  opportunity: OpportunityWithRelations
  stage: PipelineStage
  onClick: () => void
  isDragging?: boolean
}

const SortableOpportunityCard = React.memo(function SortableOpportunityCard({ opportunity, stage, onClick }: SortableOpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
    data: { type: 'opportunity', opportunity, stage },
    disabled: stage.is_won || stage.is_lost,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <OpportunityCard
        opportunity={opportunity}
        isDragging={isDragging}
        onClick={onClick}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.opportunity.id === nextProps.opportunity.id &&
    prevProps.opportunity.updated_at === nextProps.opportunity.updated_at &&
    prevProps.opportunity.estimated_value === nextProps.opportunity.estimated_value &&
    prevProps.opportunity.close_probability === nextProps.opportunity.close_probability &&
    prevProps.stage.id === nextProps.stage.id &&
    prevProps.isDragging === nextProps.isDragging
  )
})

export function KanbanBoard({
  stages,
  opportunities,
  contacts = [],
  companies = [],
  services = [],
  onRefresh,
}: KanbanBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [activeOpportunity, setActiveOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formStageId, setFormStageId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const opportunity = opportunities.find((o) => o.id === active.id)
    if (opportunity) {
      setActiveOpportunity(opportunity)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as { type: string; opportunity?: OpportunityWithRelations; stage?: PipelineStage } | undefined
    const overData = over.data.current as { type: string; stage?: PipelineStage } | undefined

    if (!activeData || !overData) return

    if (activeData.type === 'opportunity' && overData.type === 'column') {
      // Moving over a column - could show visual feedback
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveOpportunity(null)

    if (!over) return

    const activeData = active.data.current as { type: string; opportunity?: OpportunityWithRelations; stage?: PipelineStage } | undefined
    const overData = over.data.current as { type: string; stage?: PipelineStage; opportunity?: OpportunityWithRelations } | undefined

    if (!activeData) return

    // Handle dropping on a column
    if (overData?.type === 'column' && activeData.opportunity && activeData.stage) {
      const newStage = overData.stage!
      const oldStage = activeData.stage

      // Don't move if it's the same stage
      if (newStage.id === oldStage.id) return

      startTransition(async () => {
        await moveStage(activeData.opportunity!.id, newStage.id)
        onRefresh?.()
      })
      return
    }

    // Handle dropping on another opportunity card (reordering within column or moving to that position's column)
    if (overData?.type === 'opportunity' && activeData.opportunity && activeData.stage) {
      const targetOpportunity = overData.opportunity!
      const newStageId = targetOpportunity.stage_id
      const oldStageId = activeData.stage.id

      // Don't move if same stage (reordering) - could implement later
      if (newStageId === oldStageId) return

      const newStage = stages.find((s) => s.id === newStageId)

      startTransition(async () => {
        await moveStage(activeData.opportunity!.id, newStageId)
        onRefresh?.()
      })
    }
  }

  function handleAddOpportunity(stageId: string) {
    setFormStageId(stageId)
    setShowForm(true)
  }

  function handleFormSuccess() {
    setShowForm(false)
    setFormStageId(null)
    onRefresh?.()
  }

  // Sort stages by position
  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.position - b.position), [stages])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sortedStages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunities}
              isDropDisabled={false}
              onCardClick={setSelectedOpportunity}
              onAddOpportunity={handleAddOpportunity}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOpportunity && (
            <div className="w-[272px]">
              <OpportunityCard opportunity={activeOpportunity} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Nueva Oportunidad</h2>
            <OpportunityForm
              stageId={formStageId ?? undefined}
              contacts={contacts}
              companies={companies}
              services={services}
              stages={sortedStages}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false)
                setFormStageId(null)
              }}
            />
          </div>
        </div>
      )}

      {selectedOpportunity && (
        <OpportunityDetailSheet
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          contacts={contacts}
          companies={companies}
          services={services}
          stages={sortedStages}
          onRefresh={onRefresh}
        />
      )}
    </>
  )
}

interface OpportunityDetailSheetProps {
  opportunity: OpportunityWithRelations
  onClose: () => void
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  services?: Array<{ id: string; name: string }>
  stages?: PipelineStage[]
  onRefresh?: () => void
}

const OpportunityDetailSheet = React.memo(function OpportunityDetailSheet({
  opportunity,
  onClose,
  contacts,
  companies,
  services,
  stages,
  onRefresh,
}: OpportunityDetailSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [localOpportunity, setLocalOpportunity] = useState(opportunity)

  const handleDelete = useCallback(() => {
    if (!confirm('¿Estás seguro de eliminar esta oportunidad?')) return
    // Would call deleteOpportunity here
    onClose()
  }, [onClose])

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-6 w-full max-w-md shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Editar Oportunidad</h2>
          <OpportunityForm
            opportunity={localOpportunity}
            contacts={contacts}
            companies={companies}
            services={services}
            stages={stages}
            onSuccess={() => {
              setIsEditing(false)
              onRefresh?.()
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-background w-full max-w-md h-full overflow-y-auto shadow-lg animate-in slide-in-from-right duration-300">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{localOpportunity.title}</h2>
              {localOpportunity.companies && (
                <p className="text-sm text-muted-foreground">{localOpportunity.companies.name}</p>
              )}
            </div>
            {localOpportunity.pipeline_stages && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor: localOpportunity.pipeline_stages.color + '20',
                  color: localOpportunity.pipeline_stages.color,
                }}
              >
                {localOpportunity.pipeline_stages.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {localOpportunity.estimated_value && (
              <div>
                <p className="text-xs text-muted-foreground">Valor estimado</p>
                <p className="text-lg font-semibold">₲{localOpportunity.estimated_value.toLocaleString('es-PY')}</p>
              </div>
            )}
            {localOpportunity.close_probability !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Probabilidad</p>
                <p className="text-sm">{localOpportunity.close_probability}%</p>
              </div>
            )}
            {localOpportunity.expected_close_date && (
              <div>
                <p className="text-xs text-muted-foreground">Fecha de cierre</p>
                <p className="text-sm">
                  {new Date(localOpportunity.expected_close_date).toLocaleDateString('es-PY', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {localOpportunity.services && localOpportunity.services.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Servicios</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {localOpportunity.services.map((svc, i) => (
                    <span key={svc.id || i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {svc.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {localOpportunity.contacts && (
            <div>
              <p className="text-xs text-muted-foreground">Contacto</p>
              <p className="text-sm">
                {localOpportunity.contacts.first_name}
                {localOpportunity.contacts.last_name ? ` ${localOpportunity.contacts.last_name}` : ''}
              </p>
            </div>
          )}

          {localOpportunity.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm whitespace-pre-wrap">{localOpportunity.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
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
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.opportunity.id === nextProps.opportunity.id &&
    prevProps.opportunity.title === nextProps.opportunity.title &&
    prevProps.opportunity.updated_at === nextProps.opportunity.updated_at &&
    prevProps.opportunity.stage_id === nextProps.opportunity.stage_id &&
    prevProps.opportunity.estimated_value === nextProps.opportunity.estimated_value &&
    prevProps.opportunity.close_probability === nextProps.opportunity.close_probability &&
    prevProps.opportunity.services === nextProps.opportunity.services
  )
})