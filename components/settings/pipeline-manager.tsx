'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  listPipelineTemplates,
  getWorkspacePipelineStages,
  getWorkspacePipelineSettings,
  applyPipelineTemplateToCurrentWorkspace,
  addPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
  PipelineStage,
  PipelineTemplate,
  PipelineTemplateStage,
  MigrationStrategy,
  ApplyTemplateResult,
} from '@/lib/actions/pipeline-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

type StageForm = {
  name: string
  description: string
  probability: number
  color: string
  is_won: boolean
  is_lost: boolean
  is_default: boolean
}

type EditableStage = PipelineStage & {
  editedName: string
  editedDescription: string
  editedProbability: number
  editedColor: string
  editedIsActive: boolean
  editedIsWon: boolean
  editedIsLost: boolean
  hasChanges: boolean
}

type ModalMode = 'add' | 'edit' | 'reorder' | 'delete' | null

// ============================================
// COMPONENT
// ============================================

interface PipelineManagerProps {
  initialStages: PipelineStage[]
}

export function PipelineManager({ initialStages }: PipelineManagerProps) {
  const router = useRouter()
  const [stages, setStages] = useState<EditableStage[]>([])
  const [templates, setTemplates] = useState<PipelineTemplate[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [formData, setFormData] = useState<StageForm>({
    name: '',
    description: '',
    probability: 50,
    color: '#6366f1',
    is_won: false,
    is_lost: false,
    is_default: false,
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Delete fallback state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [fallbackStageId, setFallbackStageId] = useState<string | null>(null)
  const [opportunityCount, setOpportunityCount] = useState(0)

  // Apply template state
  const [applyingTemplateSlug, setApplyingTemplateSlug] = useState<string | null>(null)
  const [showApplyConfirm, setShowApplyConfirm] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  // Migration modal state
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [migrationInfo, setMigrationInfo] = useState<{
    templateSlug: string
    opportunityCount: number
    stagesWithOpportunities: Array<{ stageId: string; stageName: string; opportunityCount: number }>
    templateStages: PipelineTemplateStage[]
  } | null>(null)

  // Initialize data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    const [stagesResult, templatesResult, settingsResult] = await Promise.all([
      getWorkspacePipelineStages(),
      listPipelineTemplates(),
      getWorkspacePipelineSettings(),
    ])

    setLoading(false)

    if (!stagesResult.success) {
      setError(stagesResult.error ?? 'Error cargando etapas')
      return
    }

    if (!templatesResult.success) {
      setError(templatesResult.error ?? 'Error cargando templates')
      return
    }

    setStages(
      (stagesResult.data ?? []).map((s) => ({
        ...s,
        editedName: s.name,
        editedDescription: s.description ?? '',
        editedProbability: s.probability,
        editedColor: s.color ?? '#6366f1',
        editedIsActive: s.is_active,
        editedIsWon: s.is_won,
        editedIsLost: s.is_lost,
        hasChanges: false,
      }))
    )

    setTemplates(templatesResult.data ?? [])
    setActiveTemplateId(settingsResult.data?.active_template_id ?? null)
  }

  // Mark stage as changed
  const markChanged = useCallback((id: string, field: keyof StageForm, value: unknown) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const updated = { ...s, [field]: value, hasChanges: true }
        return updated
      })
    )
  }, [])

  // Move stage up/down
  const moveStage = useCallback((id: string, direction: 'up' | 'down') => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev
      const newStages = [...prev]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= newStages.length) return prev
      const temp = newStages[idx]
      newStages[idx] = newStages[targetIdx]
      newStages[targetIdx] = temp
      return newStages
    })
  }, [])

  // Open add modal
  const openAddModal = () => {
    setModalMode('add')
    setEditingStageId(null)
    setFormData({
      name: '',
      description: '',
      probability: 50,
      color: '#6366f1',
      is_won: false,
      is_lost: false,
      is_default: false,
    })
    setFormError(null)
  }

  // Open edit modal
  const openEditModal = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    if (!stage) return

    setModalMode('edit')
    setEditingStageId(stageId)
    setFormData({
      name: stage.editedName,
      description: stage.editedDescription,
      probability: stage.editedProbability,
      color: stage.editedColor,
      is_won: stage.editedIsWon,
      is_lost: stage.editedIsLost,
      is_default: stage.is_default,
    })
    setFormError(null)
  }

  // Open delete confirm
  const openDeleteConfirm = async (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    if (!stage) return

    setDeleteTargetId(stageId)
    setFallbackStageId(null)
    setOpportunityCount(0)
    setModalMode('delete')

    // Check if there are opportunities associated
    // For now we'll show the confirm and let server action determine
  }

  // Close modal
  const closeModal = () => {
    setModalMode(null)
    setEditingStageId(null)
    setFormError(null)
    setDeleteTargetId(null)
    setFallbackStageId(null)
  }

  // Handle add stage
  const handleAddStage = async () => {
    if (!formData.name.trim()) {
      setFormError('El nombre no puede estar vacío')
      return
    }
    if (formData.probability < 0 || formData.probability > 100) {
      setFormError('La probabilidad debe ser entre 0 y 100')
      return
    }

    const result = await addPipelineStage({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      probability: formData.probability,
      color: formData.color,
      is_won: formData.is_won,
      is_lost: formData.is_lost,
      is_default: formData.is_default,
    })

    if (!result.success) {
      setFormError(result.error ?? 'Error agregando etapa')
      return
    }

    setSuccess('Etapa agregada correctamente')
    closeModal()
    await loadData()
    router.refresh()
  }

  // Handle update stage
  const handleUpdateStage = async () => {
    if (!editingStageId) return

    if (!formData.name.trim()) {
      setFormError('El nombre no puede estar vacío')
      return
    }
    if (formData.probability < 0 || formData.probability > 100) {
      setFormError('La probabilidad debe ser entre 0 y 100')
      return
    }

    const result = await updatePipelineStage(editingStageId, {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      probability: formData.probability,
      color: formData.color,
      is_active: true,
      is_won: formData.is_won,
      is_lost: formData.is_lost,
      is_default: formData.is_default,
    })

    if (!result.success) {
      setFormError(result.error ?? 'Error actualizando etapa')
      return
    }

    setSuccess('Etapa actualizada correctamente')
    closeModal()
    await loadData()
    router.refresh()
  }

  // Handle delete stage
  const handleDeleteStage = async () => {
    if (!deleteTargetId) return

    const result = await deletePipelineStage(deleteTargetId, fallbackStageId || undefined)

    if (!result.success) {
      setFormError(result.error ?? 'Error eliminando etapa')
      return
    }

    setSuccess('Etapa eliminada correctamente')
    closeModal()
    await loadData()
    router.refresh()
  }

  // Handle save reorder
  const handleSaveReorder = async () => {
    setIsReordering(true)
    const stageIds = stages.map((s) => s.id)
    const result = await reorderPipelineStages(stageIds)
    setIsReordering(false)

    if (!result.success) {
      setError(result.error ?? 'Error al reordenar')
      return
    }

    setSuccess('Orden guardado correctamente')
    await loadData()
    router.refresh()
  }

  // Handle apply template
  const handleApplyTemplate = async (slug: string, migrationStrategy?: MigrationStrategy) => {
    setApplyingTemplateSlug(slug)
    setShowApplyConfirm(null)
    setError(null)

    const result = await applyPipelineTemplateToCurrentWorkspace(slug, { migrationStrategy })

    setApplyingTemplateSlug(null)

    if (!result.success) {
      if ('opportunityCount' in result && 'stagesWithOpportunities' in result) {
        // OPPORTUNITIES_EXIST case - show migration modal
        setMigrationInfo({
          templateSlug: slug,
          opportunityCount: result.opportunityCount,
          stagesWithOpportunities: result.stagesWithOpportunities,
          templateStages: result.templateStages,
        })
        setShowMigrationModal(true)
      } else {
        const errorMessage = 'error' in result ? result.error : 'Error aplicando template'
        setError(errorMessage ?? 'Error aplicando template')
      }
      return
    }

    setSuccess('Template aplicado correctamente')
    await loadData()
    router.refresh()
  }

  // Handle migration from modal
  const handleMigrationApply = async (strategy: MigrationStrategy) => {
    if (!migrationInfo) return

    setApplyingTemplateSlug(migrationInfo.templateSlug)
    setShowMigrationModal(false)

    const result = await applyPipelineTemplateToCurrentWorkspace(migrationInfo.templateSlug, { migrationStrategy: strategy })

    setApplyingTemplateSlug(null)

    if (!result.success) {
      const errorMessage = 'error' in result ? result.error : 'Error aplicando template con migración'
      setError(errorMessage ?? 'Error aplicando template con migración')
      return
    }

    setSuccess('Template aplicado y oportunidades migradas correctamente')
    setMigrationInfo(null)
    await loadData()
    router.refresh()
  }

  // Get stage badge color
  const getBadgeColor = (stage: EditableStage) => {
    if (stage.is_won) return 'bg-green-900/50 text-green-300 border border-green-700'
    if (stage.is_lost) return 'bg-red-900/50 text-red-300 border border-red-700'
    return ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Cargando pipeline...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#E31E24]" />
          <span className="text-[11px] font-mono text-zinc-200 uppercase tracking-widest font-semibold">
            Pipeline Builder
          </span>
          <span className="text-[10px] font-mono text-zinc-600">
            {stages.length} etapas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openAddModal}
            size="sm"
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:border-zinc-600 transition-colors"
          >
            <Plus size={10} />
            Agregar etapa
          </Button>
          {stages.some((s) => s.hasChanges) && (
            <Button
              onClick={handleSaveReorder}
              disabled={isReordering}
              size="sm"
              className="flex items-center gap-1 px-3 py-1.5 bg-[#E31E24]/20 border border-[#E31E24]/50 rounded text-[10px] font-mono text-[#E31E24] hover:bg-[#E31E24]/30 transition-colors disabled:opacity-50"
            >
              <Check size={10} />
              {isReordering ? 'Guardando...' : 'Guardar orden'}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded text-[11px] font-mono text-red-400">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/50 rounded text-[11px] font-mono text-green-400">
          <Check size={12} />
          {success}
        </div>
      )}

      {/* Stage List */}
      {stages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              No hay etapas configuradas. Agregá la primera etapa o aplicá un template.
            </span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={`
                relative flex items-start gap-3 p-3 rounded border
                ${stage.editedIsActive
                  ? 'bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600'
                  : 'bg-zinc-950/50 border-zinc-800/30 opacity-60'
                }
                ${stage.hasChanges ? 'border-yellow-600/30' : ''}
              `}
            >
              {/* Position controls */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="text-[10px] font-mono text-zinc-600">{index + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStage(stage.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover arriba"
                  >
                    <ChevronUp size={12} className="text-zinc-500" />
                  </button>
                  <button
                    onClick={() => moveStage(stage.id, 'down')}
                    disabled={index === stages.length - 1}
                    className="p-0.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover abajo"
                  >
                    <ChevronDown size={12} className="text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Color indicator */}
              <div
                className="w-3 h-3 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: stage.editedColor }}
              />

              {/* Stage info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-200 font-medium">
                    {stage.editedName}
                  </span>
                  {stage.is_won && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-green-900/50 text-green-300 border border-green-700 uppercase">
                      GANADO
                    </span>
                  )}
                  {stage.is_lost && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700 uppercase">
                      PERDIDO
                    </span>
                  )}
                  {stage.is_default && !stage.is_won && !stage.is_lost && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400 border border-zinc-600 uppercase">
                      DEFAULT
                    </span>
                  )}
                </div>
                {stage.editedDescription && (
                  <p className="text-[10px] font-mono text-zinc-500">{stage.editedDescription}</p>
                )}
                <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-600">
                  <span>Prob: {stage.editedProbability}%</span>
                  <span className={`text-[10px] font-mono ${stage.editedIsActive ? 'text-green-400' : 'text-zinc-600'}`}>
                    {stage.editedIsActive ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(stage.id)}
                  className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
                  title="Editar"
                >
                  <Pencil size={12} className="text-zinc-400" />
                </button>
                <button
                  onClick={() => openDeleteConfirm(stage.id)}
                  className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={12} className="text-zinc-500 hover:text-red-400" />
                </button>
              </div>

              {/* Change indicator */}
              {stage.hasChanges && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-500" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Templates Section */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={12} className="text-zinc-500" />
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            Templates de Pipeline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => {
            const isActive = template.id === activeTemplateId

            return (
              <div
                key={template.id}
                className={`
                  relative p-3 rounded border transition-all
                  ${isActive
                    ? 'bg-zinc-900/90 border-[#E31E24]/60'
                    : 'bg-zinc-950/70 border-zinc-800/70 hover:border-zinc-700'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-[#E31E24]/30 border border-[#E31E24]/60 rounded text-[8px] font-mono text-[#E31E24] uppercase">
                    <Check size={8} />
                    Activo
                  </div>
                )}

                <div className="space-y-1">
                  <h4 className="text-[11px] font-mono text-zinc-200 font-semibold">
                    {template.name}
                  </h4>
                  {template.industry && (
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">
                      {template.industry}
                    </span>
                  )}
                  <p className="text-[9px] font-mono text-zinc-600 line-clamp-1">
                    {template.stage_count} etapas
                  </p>
                </div>

                {showApplyConfirm === template.slug ? (
                  <div className="mt-2 pt-2 border-t border-yellow-600/40 bg-yellow-900/10 rounded-sm">
                    <p className="text-[9px] font-mono text-yellow-500 mb-2">
                      ¿Reemplazar etapas actuales?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyTemplate(template.slug)}
                        disabled={applyingTemplateSlug === template.slug}
                        className="flex-1 px-2 py-1 bg-yellow-600/30 border border-yellow-600/60 rounded-sm text-[9px] font-mono text-yellow-300 hover:bg-yellow-600/40 transition-colors disabled:opacity-50"
                      >
                        {applyingTemplateSlug === template.slug ? 'Aplicando...' : 'Sí, aplicar'}
                      </button>
                      <button
                        onClick={() => setShowApplyConfirm(null)}
                        className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-sm text-[9px] font-mono text-zinc-400 hover:bg-zinc-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  !isActive && (
                    <button
                      onClick={() => setShowApplyConfirm(template.slug)}
                      className="mt-2 w-full px-2 py-1 bg-[#E31E24]/20 border border-[#E31E24]/50 rounded-sm text-[9px] font-mono text-[#E31E24] hover:bg-[#E31E24]/30 transition-colors"
                    >
                      Aplicar
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add/Edit Stage Modal */}
      {modalMode === 'add' || modalMode === 'edit' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">
                {modalMode === 'add' ? 'Agregar Etapa' : 'Editar Etapa'}
              </h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-zinc-800 transition-colors">
                <X size={14} className="text-zinc-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <Label className="text-[9px] font-mono text-zinc-500 uppercase">Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-200 text-[11px] font-mono"
                  placeholder="Nombre de la etapa"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-[9px] font-mono text-zinc-500 uppercase">Descripción</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-200 text-[11px] font-mono"
                  placeholder="Descripción opcional"
                />
              </div>

              {/* Probability */}
              <div>
                <Label className="text-[9px] font-mono text-zinc-500 uppercase">Probabilidad (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData((p) => ({ ...p, probability: parseInt(e.target.value) || 0 }))}
                  className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-200 text-[11px] font-mono"
                />
              </div>

              {/* Color */}
              <div>
                <Label className="text-[9px] font-mono text-zinc-500 uppercase">Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                    className="w-8 h-8 rounded border border-zinc-700 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                    className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-200 text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_won"
                    checked={formData.is_won}
                    onChange={(e) => setFormData((p) => ({ ...p, is_won: e.target.checked }))}
                    className="rounded border-zinc-700"
                  />
                  <label htmlFor="is_won" className="text-[10px] font-mono text-zinc-400">
                    Etapa de GANADO (solo puede haber una)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_lost"
                    checked={formData.is_lost}
                    onChange={(e) => setFormData((p) => ({ ...p, is_lost: e.target.checked }))}
                    className="rounded border-zinc-700"
                  />
                  <label htmlFor="is_lost" className="text-[10px] font-mono text-zinc-400">
                    Etapa de PERDIDO (solo puede haber una)
                  </label>
                </div>
                {formData.is_won && (
                  <p className="text-[9px] font-mono text-yellow-500">
                    Solo una etapa puede ser "Ganado"
                  </p>
                )}
                {formData.is_lost && (
                  <p className="text-[9px] font-mono text-yellow-500">
                    Solo una etapa puede ser "Perdido"
                  </p>
                )}
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/20 border border-red-800/50 rounded text-[10px] font-mono text-red-400">
                  <AlertTriangle size={10} />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={modalMode === 'add' ? handleAddStage : handleUpdateStage}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E31E24]/20 border border-[#E31E24]/50 rounded text-[10px] font-mono text-[#E31E24] hover:bg-[#E31E24]/30 transition-colors"
              >
                {modalMode === 'add' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && deleteTargetId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">
                Eliminar Etapa
              </h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-zinc-800 transition-colors">
                <X size={14} className="text-zinc-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border border-yellow-800/50 rounded text-[11px] font-mono text-yellow-400">
                <AlertTriangle size={14} />
                <span>Esta acción no se puede deshacer.</span>
              </div>

              <p className="text-[10px] font-mono text-zinc-400">
                Si hay oportunidades asociadas a esta etapa, necesitás elegir una etapa de destino para moverlas antes de eliminar.
              </p>

              <div>
                <Label className="text-[9px] font-mono text-zinc-500 uppercase">
                  Mover oportunidades a:
                </Label>
                <select
                  value={fallbackStageId ?? ''}
                  onChange={(e) => setFallbackStageId(e.target.value || null)}
                  className="mt-1 w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300"
                >
                  <option value="">Seleccionar etapa destino...</option>
                  {stages
                    .filter((s) => s.id !== deleteTargetId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/20 border border-red-800/50 rounded text-[10px] font-mono text-red-400">
                  <AlertTriangle size={10} />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteStage}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-900/30 border border-red-800/50 rounded text-[10px] font-mono text-red-400 hover:bg-red-900/40 transition-colors"
              >
                <Trash2 size={10} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Migration Modal */}
      {showMigrationModal && migrationInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-yellow-600/50 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">
                Migrar Oportunidades
              </h3>
              <button
                onClick={() => {
                  setShowMigrationModal(false)
                  setMigrationInfo(null)
                }}
                className="p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <X size={14} className="text-zinc-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border border-yellow-800/50 rounded text-[11px] font-mono text-yellow-400">
                <AlertTriangle size={14} />
                <span>Este pipeline tiene {migrationInfo.opportunityCount} oportunidad{migrationInfo.opportunityCount !== 1 ? 'es' : ''} activas.</span>
              </div>

              <p className="text-[10px] font-mono text-zinc-400">
                Para aplicar el nuevo template, tenés que mover las oportunidades a etapas del nuevo pipeline.
              </p>

              <div className="space-y-2">
                <Label className="text-[9px] font-mono text-zinc-500 uppercase">
                  ¿Cómo querés migrar las oportunidades?
                </Label>

                <button
                  onClick={() => handleMigrationApply('move_all_to_default')}
                  disabled={applyingTemplateSlug !== null}
                  className="w-full p-3 text-left bg-zinc-800/50 border border-zinc-700 rounded hover:border-zinc-600 transition-colors disabled:opacity-50"
                >
                  <span className="text-[11px] font-mono text-zinc-200 font-medium block">
                    Mover todas a la etapa inicial
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    Todas las oportunidades se moverán a la primera etapa del nuevo pipeline.
                  </span>
                </button>

                <button
                  onClick={() => handleMigrationApply('preserve_won_lost')}
                  disabled={applyingTemplateSlug !== null}
                  className="w-full p-3 text-left bg-zinc-800/50 border border-zinc-700 rounded hover:border-zinc-600 transition-colors disabled:opacity-50"
                >
                  <span className="text-[11px] font-mono text-zinc-200 font-medium block">
                    Preservar ganadas/perdidas
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    Oportunidades en etapas "Ganado" van a la etapa Ganado del nuevo pipeline. Lo mismo para "Perdido". Las demás van a la etapa inicial.
                  </span>
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/20 border border-red-800/50 rounded text-[10px] font-mono text-red-400">
                  <AlertTriangle size={10} />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  setShowMigrationModal(false)
                  setMigrationInfo(null)
                }}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}