'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getDashboardBuilderConfig,
  updateDashboardLayout,
  resetDashboardToTemplate,
  deleteDashboardLayoutItem,
  addDashboardWidgetInstance,
  updateDashboardWidgetInstance,
} from '@/lib/actions/dashboard-builder'
import {
  isValidWidgetType,
  isSizeAllowed,
  getWidgetDefinition,
} from '@/lib/widgets/registry'
import { WidgetType, WidgetSize } from '@/lib/widgets/types'
import { ArrowUp, ArrowDown, Eye, EyeOff, Save, RotateCcw, AlertTriangle, Trash2, Plus, X, Pencil } from 'lucide-react'

// ============================================
// TYPES
// ============================================

type DashboardBuilderItem = {
  id: string
  instance_key: string
  widget_type: string
  title_override: string | null
  data_source: string
  metric: string
  size: 'small' | 'medium' | 'large'
  position: number
  is_active: boolean
  config_json: Record<string, unknown>
}

type EditableWidget = DashboardBuilderItem & {
  editedTitle: string
  editedSize: 'small' | 'medium' | 'large'
  editedPosition: number
  editedIsActive: boolean
  hasChanges: boolean
}

type WidgetForm = {
  widget_type: WidgetType
  title_override: string
  data_source: string
  metric: string
  size: 'small' | 'medium' | 'large'
}

type ModalMode = 'add' | 'edit' | null

// ============================================
// COMPONENT
// ============================================

interface DashboardBuilderProps {
  initialData: DashboardBuilderItem[]
}

export function DashboardBuilder({ initialData }: DashboardBuilderProps) {
  const router = useRouter()
  const [widgets, setWidgets] = useState<EditableWidget[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Pending deletes (marked for deletion but not yet saved)
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Modal state (add/edit)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null)
  const [formData, setFormData] = useState<WidgetForm>({
    widget_type: 'KPI_CARD',
    title_override: '',
    data_source: 'leads',
    metric: 'count',
    size: 'small',
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Initialize widgets from server data
  useEffect(() => {
    setWidgets(
      initialData.map((w) => ({
        ...w,
        editedTitle: w.title_override ?? '',
        editedSize: w.size,
        editedPosition: w.position,
        editedIsActive: w.is_active,
        hasChanges: false,
      }))
    )
  }, [initialData])

  // Mark widget as changed
  const markChanged = useCallback(
    (id: string, field: 'title' | 'size' | 'position' | 'is_active', value: unknown) => {
      setWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w

          // Map field name to the correct EditableWidget property
          let updated: EditableWidget
          switch (field) {
            case 'title':
              updated = { ...w, editedTitle: value as string, hasChanges: true }
              break
            case 'size':
              updated = { ...w, editedSize: value as 'small' | 'medium' | 'large', hasChanges: true }
              break
            case 'position':
              updated = { ...w, editedPosition: value as number, hasChanges: true }
              break
            case 'is_active':
              updated = { ...w, editedIsActive: value as boolean, hasChanges: true }
              break
            default:
              return w
          }

          // Recalculate hasChanges based on whether any field differs from original
          updated.hasChanges =
            updated.editedTitle !== (w.title_override ?? '') ||
            updated.editedSize !== w.size ||
            updated.editedPosition !== w.position ||
            updated.editedIsActive !== w.is_active
          return updated
        })
      )
    },
    []
  )

  // Move widget up/down
  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id)
      if (idx === -1) return prev

      const newWidgets = [...prev]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= newWidgets.length) return prev

      // Swap positions
      const tempPos = newWidgets[idx].editedPosition
      newWidgets[idx] = { ...newWidgets[idx], editedPosition: newWidgets[targetIdx].editedPosition, hasChanges: true }
      newWidgets[targetIdx] = { ...newWidgets[targetIdx], editedPosition: tempPos, hasChanges: true }

      // Sort by position
      newWidgets.sort((a, b) => a.editedPosition - b.editedPosition)
      return newWidgets
    })
  }, [])

  // Toggle active
  const toggleActive = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        const newActive = !w.editedIsActive
        const updated = { ...w, editedIsActive: newActive, hasChanges: true }
        updated.hasChanges =
          updated.editedTitle !== (w.title_override ?? '') ||
          updated.editedSize !== w.size ||
          updated.editedPosition !== w.position ||
          updated.editedIsActive !== w.is_active
        return updated
      })
    )
  }, [])

  // Delete widget (mark as pending delete)
  const handleDeleteWidget = useCallback((id: string) => {
    setPendingDeletes((prev) => new Set([...prev, id]))
  }, [])

  // Open add modal
  const openAddModal = () => {
    setModalMode('add')
    setEditingWidgetId(null)
    setFormData({
      widget_type: 'KPI_CARD',
      title_override: '',
      data_source: 'leads',
      metric: 'count',
      size: 'small',
    })
    setFormError(null)
  }

  // Open edit modal
  const openEditModal = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    setModalMode('edit')
    setEditingWidgetId(widgetId)
    setFormData({
      widget_type: widget.widget_type as WidgetType,
      title_override: widget.editedTitle,
      data_source: widget.data_source,
      metric: widget.metric,
      size: widget.editedSize,
    })
    setFormError(null)
  }

  // Close modal
  const closeModal = () => {
    setModalMode(null)
    setEditingWidgetId(null)
    setFormError(null)
  }

  // Get available data sources for widget type
  const getAvailableDataSources = (type: WidgetType): string[] => {
    const def = getWidgetDefinition(type)
    return def?.allowedDataSources ?? ['leads', 'companies', 'opportunities', 'tasks']
  }

  // Get available metrics for widget type
  const getAvailableMetrics = (type: WidgetType): string[] => {
    const def = getWidgetDefinition(type)
    return def?.allowedMetrics ?? ['count']
  }

  // Get available sizes for widget type
  const getAvailableSizes = (type: WidgetType): Array<'small' | 'medium' | 'large'> => {
    const def = getWidgetDefinition(type)
    return def?.allowedSizes ?? ['small', 'medium', 'large']
  }

  // Handle widget type change
  const handleWidgetTypeChange = (type: string) => {
    const widgetType = type as WidgetType
    const def = getWidgetDefinition(widgetType)
    setFormData((prev) => ({
      ...prev,
      widget_type: widgetType,
      data_source: def?.allowedDataSources[0] ?? 'leads',
      metric: def?.allowedMetrics[0] ?? 'count',
      size: def?.allowedSizes?.[0] ?? 'small',
    }))
  }

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updates = widgets.map((w) => ({
        id: w.id,
        title_override: w.editedTitle || null,
        size: w.editedSize,
        position: w.editedPosition,
        is_active: w.editedIsActive,
        config_json: w.config_json,
      }))

      const result = await updateDashboardLayout(updates)

      if (!result.success) {
        setError(result.error ?? 'Error saving changes')
        return
      }

      // Handle pending deletes
      if (pendingDeletes.size > 0) {
        for (const id of pendingDeletes) {
          const deleteResult = await deleteDashboardLayoutItem(id)
          if (!deleteResult.success) {
            setDeleteError(deleteResult.error ?? 'Error deleting widget')
          }
        }
        setPendingDeletes(new Set())
      }

      setSuccess('Cambios guardados correctamente')
      setWidgets((prev) =>
        prev.map((w) => ({
          ...w,
          title_override: w.editedTitle || null,
          size: w.editedSize,
          position: w.editedPosition,
          is_active: w.editedIsActive,
          hasChanges: false,
        }))
      )

      router.refresh()
    } catch (e) {
      setError('Error de red al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle add/edit widget
  const handleSubmitWidget = async () => {
    if (!formData.title_override.trim()) {
      setFormError('El título no puede estar vacío')
      return
    }

    try {
      if (modalMode === 'add') {
        const result = await addDashboardWidgetInstance({
          widget_type: formData.widget_type,
          title_override: formData.title_override,
          data_source: formData.data_source,
          metric: formData.metric,
          size: formData.size,
        })

        if (!result.success) {
          setFormError(result.error ?? 'Error agregando widget')
          return
        }

        setSuccess('Widget agregado correctamente')
      } else if (modalMode === 'edit' && editingWidgetId) {
        const result = await updateDashboardWidgetInstance(editingWidgetId, {
          title_override: formData.title_override || null,
          data_source: formData.data_source,
          metric: formData.metric,
          size: formData.size,
        })

        if (!result.success) {
          setFormError(result.error ?? 'Error actualizando widget')
          return
        }

        setSuccess('Widget actualizado correctamente')
      }

      closeModal()
      router.refresh()
    } catch (e) {
      setFormError('Error de red al guardar widget')
    }
  }

  // Reset to template
  const handleReset = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }

    setIsResetting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await resetDashboardToTemplate('maite-media-agency')

      if (!result.success) {
        setError(result.error ?? 'Error resetting dashboard')
        return
      }

      setSuccess('Dashboard restaurado a valores por defecto')
      setShowResetConfirm(false)
      setPendingDeletes(new Set())
      router.refresh()
    } catch (e) {
      setError('Error de red al restaurar')
    } finally {
      setIsResetting(false)
    }
  }

  // Get widget label from registry
  const getWidgetLabel = (type: string) => {
    if (!isValidWidgetType(type as WidgetType)) return type
    const def = getWidgetDefinition(type as WidgetType)
    return def?.label ?? type
  }

  // Get size badge color
  const sizeBadgeColor = (size: string) => {
    switch (size) {
      case 'small': return 'bg-zinc-700 text-zinc-300'
      case 'medium': return 'bg-red-900/50 text-red-300 border border-red-800'
      case 'large': return 'bg-red-800/30 text-red-200 border border-red-700'
      default: return 'bg-zinc-700 text-zinc-400'
    }
  }

  // Filter out pending deletes for display
  const visibleWidgets = widgets.filter((w) => !pendingDeletes.has(w.id))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {visibleWidgets.length} widgets
          </span>
          {widgets.some((w) => w.hasChanges) && (
            <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest">
              • sin guardar
            </span>
          )}
          {pendingDeletes.size > 0 && (
            <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest">
              • {pendingDeletes.size} por eliminar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showResetConfirm ? (
            <>
              <span className="text-[10px] font-mono text-zinc-400">
                ¿Restaurar defaults?
              </span>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600/20 border border-yellow-600/50 rounded text-[10px] font-mono text-yellow-400 hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={10} />
                {isResetting ? 'Restaurando...' : 'Sí, restaurar'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:border-zinc-600 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={10} />
              Restaurar defaults
            </button>
          )}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:border-zinc-600 transition-colors"
          >
            <Plus size={10} />
            Agregar widget
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (!widgets.some((w) => w.hasChanges) && pendingDeletes.size === 0)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#E31E24]/20 border border-[#E31E24]/50 rounded text-[10px] font-mono text-[#E31E24] hover:bg-[#E31E24]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={10} />
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded text-[11px] font-mono text-red-400">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded text-[11px] font-mono text-red-400">
          <AlertTriangle size={12} />
          {deleteError}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/50 rounded text-[11px] font-mono text-green-400">
          {success}
        </div>
      )}

      {/* Widget List */}
      <div className="space-y-2">
        {visibleWidgets.map((widget, index) => {
          const isUnknownType = !isValidWidgetType(widget.widget_type as WidgetType)

          return (
            <div
              key={widget.id}
              className={`
                relative flex items-start gap-3 p-3 rounded border
                ${widget.editedIsActive
                  ? 'bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600'
                  : 'bg-zinc-950/50 border-zinc-800/30 opacity-60'
                }
                ${widget.hasChanges ? 'border-yellow-600/30' : ''}
              `}
            >
              {/* Position badge */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="text-[10px] font-mono text-zinc-600">{widget.editedPosition}</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover arriba"
                  >
                    <ArrowUp size={10} className="text-zinc-500" />
                  </button>
                  <button
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={index === visibleWidgets.length - 1}
                    className="p-0.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover abajo"
                  >
                    <ArrowDown size={10} className="text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Widget info */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title override */}
                <div>
                  <label className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
                    Título
                  </label>
                  <input
                    type="text"
                    value={widget.editedTitle}
                    onChange={(e) => markChanged(widget.id, 'title', e.target.value)}
                    className="mt-0.5 w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                    placeholder={widget.instance_key}
                  />
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Widget type */}
                  <span className={`
                    text-[9px] font-mono px-1.5 py-0.5 rounded border
                    ${isUnknownType
                      ? 'bg-red-900/20 border-red-800/50 text-red-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }
                  `}>
                    {getWidgetLabel(widget.widget_type)}
                  </span>

                  {/* Size selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-zinc-600">Size:</span>
                    {(['small', 'medium', 'large'] as const).map((size) => {
                      const allowed = !isUnknownType && isSizeAllowed(widget.widget_type as WidgetType, size)
                      return (
                        <button
                          key={size}
                          onClick={() => allowed && markChanged(widget.id, 'size', size)}
                          disabled={!allowed}
                          className={`
                            text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors
                            ${widget.editedSize === size
                              ? sizeBadgeColor(size)
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                            }
                            ${!allowed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                          title={allowed ? `Cambiar a ${size}` : 'No disponible para este widget'}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(widget.id)}
                    className={`
                      flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors
                      ${widget.editedIsActive
                        ? 'bg-green-900/20 border-green-800/50 text-green-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                      }
                    `}
                    title={widget.editedIsActive ? 'Desactivar' : 'Activar'}
                  >
                    {widget.editedIsActive ? <Eye size={10} /> : <EyeOff size={10} />}
                    {widget.editedIsActive ? 'ON' : 'OFF'}
                  </button>

                  {/* Edit button */}
                  <button
                    onClick={() => openEditModal(widget.id)}
                    className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Editar widget"
                  >
                    <Pencil size={10} />
                    EDITAR
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteWidget(widget.id)}
                    className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-red-800 hover:text-red-400 transition-colors"
                    title="Eliminar widget"
                  >
                    <Trash2 size={10} />
                    ELIMINAR
                  </button>
                </div>
              </div>

              {/* Change indicator */}
              {widget.hasChanges && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-500" />
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit Widget Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-red-800/50 rounded-lg shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">
                {modalMode === 'add' ? 'Agregar Widget' : 'Editar Widget'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <X size={14} className="text-zinc-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Title Override */}
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.title_override}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title_override: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                  placeholder="Nombre visible del widget"
                />
              </div>

              {modalMode === 'add' && (
                <>
                  {/* Widget Type (only for add) */}
                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                      Tipo de Widget
                    </label>
                    <select
                      value={formData.widget_type}
                      onChange={(e) => handleWidgetTypeChange(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-600"
                    >
                      <option value="KPI_CARD">KPI Card</option>
                      <option value="BAR_CHART">Bar Chart</option>
                      <option value="DONUT_CHART">Donut Chart</option>
                      <option value="FUNNEL_CHART">Funnel Chart</option>
                      <option value="LIST_WIDGET">List Widget</option>
                    </select>
                  </div>
                </>
              )}

              {/* Data Source */}
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Fuente de Datos
                </label>
                <select
                  value={formData.data_source}
                  onChange={(e) => setFormData((prev) => ({ ...prev, data_source: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-600"
                >
                  {getAvailableDataSources(formData.widget_type).map((source) => (
                    <option key={source} value={source}>
                      {source.charAt(0).toUpperCase() + source.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric */}
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Métrica
                </label>
                <select
                  value={formData.metric}
                  onChange={(e) => setFormData((prev) => ({ ...prev, metric: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-600"
                >
                  {getAvailableMetrics(formData.widget_type).map((m) => (
                    <option key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size */}
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  Tamaño
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {(['small', 'medium', 'large'] as const).map((size) => {
                    const available = getAvailableSizes(formData.widget_type)
                    const isAvailable = available.includes(size)
                    return (
                      <button
                        key={size}
                        onClick={() => isAvailable && setFormData((prev) => ({ ...prev, size }))}
                        disabled={!isAvailable}
                        className={`
                          flex-1 text-[9px] font-mono px-2 py-1.5 rounded border transition-colors
                          ${formData.size === size
                            ? sizeBadgeColor(size)
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                          }
                          ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-red-900/20 border border-red-800/50 rounded text-[10px] font-mono text-red-400">
                  <AlertTriangle size={10} />
                  {formError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitWidget}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#E31E24]/20 border border-[#E31E24]/50 rounded text-[10px] font-mono text-[#E31E24] hover:bg-[#E31E24]/30 transition-colors"
              >
                <Plus size={10} />
                {modalMode === 'add' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview section */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-3">
          Vista previa
        </p>
        <div className="grid grid-cols-4 gap-2">
          {visibleWidgets.map((widget) => (
            <div
              key={widget.id}
              className={`
                p-2 rounded border text-center
                ${widget.editedIsActive
                  ? 'bg-zinc-900/60 border-zinc-700/50'
                  : 'bg-zinc-950 border-zinc-800/30'
                }
              `}
            >
              <span className={`
                text-[8px] font-mono uppercase tracking-wider block mb-1
                ${widget.editedIsActive ? 'text-zinc-400' : 'text-zinc-700'}
              `}>
                {widget.editedSize}
              </span>
              <span className={`
                text-[10px] font-mono truncate block
                ${widget.editedIsActive ? 'text-zinc-300' : 'text-zinc-600'}
              `}>
                {widget.editedTitle || widget.instance_key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}