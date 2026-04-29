'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, X, LayoutGrid } from 'lucide-react'

// ============================================
// TYPES
// ============================================

type TemplateInfo = {
  id: string
  name: string
  slug: string
  description: string | null
  industry: string | null
  widget_count: number
  is_active: boolean
}

interface DashboardTemplateSelectorProps {
  currentTemplateSlug?: string
}

// ============================================
// SERVER ACTIONS (to be imported from @/lib/actions/dashboard-templates)
// ============================================

async function listDashboardTemplates(): Promise<{
  success: boolean
  data?: TemplateInfo[]
  error?: string
}> {
  const { listDashboardTemplates: fetchTemplates } = await import('@/lib/actions/dashboard-templates')
  return fetchTemplates()
}

async function applyDashboardTemplateToCurrentWorkspace(
  templateSlug: string
): Promise<{ success: boolean; error?: string }> {
  const { applyDashboardTemplateToCurrentWorkspace: applyTemplate } = await import(
    '@/lib/actions/dashboard-templates'
  )
  return applyTemplate(templateSlug)
}

// ============================================
// COMPONENT
// ============================================

export function DashboardTemplateSelector({
  currentTemplateSlug,
}: DashboardTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingSlug, setApplyingSlug] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const router = useRouter()

  // Fetch templates on mount
  useEffect(() => {
    let isMounted = true

    async function loadTemplates() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await listDashboardTemplates()

        if (!isMounted) return

        if (!result.success) {
          setError(result.error ?? 'Error cargando templates')
          return
        }

        setTemplates(result.data ?? [])
      } catch (e) {
        if (!isMounted) return
        setError('Error de red al cargar templates')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadTemplates()

    return () => {
      isMounted = false
    }
  }, [])

  // Handle apply button click - show confirmation
  const handleApplyClick = (slug: string) => {
    setShowConfirm(slug)
    setApplyError(null)
  }

  // Handle cancel confirmation
  const handleCancel = () => {
    setShowConfirm(null)
    setApplyError(null)
  }

  // Handle confirm apply
  const handleConfirmApply = async (slug: string) => {
    setApplyingSlug(slug)
    setApplyError(null)
    setApplySuccess(null)

    try {
      const result = await applyDashboardTemplateToCurrentWorkspace(slug)

      if (!result.success) {
        setApplyError(result.error ?? 'Error aplicando template')
        return
      }

      setApplySuccess('Template aplicado correctamente')
      setShowConfirm(null)

      // Refresh Next.js router after short delay to reflect changes
      setTimeout(() => {
        router.refresh()
      }, 800)
    } catch (e) {
      setApplyError('Error de red al aplicar template')
    } finally {
      setApplyingSlug(null)
    }
  }

  // Check if template is the current active one
  const isCurrentTemplate = (slug: string) =>
    currentTemplateSlug ? slug === currentTemplateSlug : false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <LayoutGrid size={14} className="text-[#E31E24]" />
        <span className="text-[11px] font-mono text-zinc-200 uppercase tracking-widest font-semibold">
          Templates
        </span>
        {templates.length > 0 && (
          <span className="text-[10px] font-mono text-zinc-600">
            {templates.length}
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Cargando templates...
          </div>
        </div>
      )}

      {/* Error fetching */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded text-[11px] font-mono text-red-400">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Template grid */}
      {!isLoading && !error && templates.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => {
            const isActive = isCurrentTemplate(template.slug)
            const isConfirming = showConfirm === template.slug
            const isApplying = applyingSlug === template.slug

            return (
              <div
                key={template.id}
                className={`
                  relative p-4 rounded border transition-all duration-200
                  ${isActive
                    ? 'bg-zinc-900/90 border-[#E31E24]/60 shadow-lg shadow-[#E31E24]/10'
                    : 'bg-zinc-950/70 border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/50'
                  }
                `}
              >
                {/* Active badge */}
                {isActive && (
                  <div
                    className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-[#E31E24]/30 border border-[#E31E24]/60 rounded text-[9px] font-mono text-[#E31E24] uppercase tracking-widest shadow-md"
                    style={{ boxShadow: '0 0 8px rgba(227,30,36,0.3)' }}
                  >
                    <Check size={8} />
                    Activo
                  </div>
                )}

                {/* Template info */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-[12px] font-mono text-zinc-100 font-semibold tracking-wide">
                      {template.name}
                    </h3>
                  </div>

                  {template.description && (
                    <p className="text-[10px] font-mono text-zinc-500 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {template.industry && (
                      <span className="text-[9px] font-mono px-2 py-1 bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 rounded-sm uppercase tracking-wider">
                        {template.industry}
                      </span>
                    )}
                    <span className="text-[9px] font-mono px-2 py-1 bg-zinc-900/80 border border-zinc-800/60 text-zinc-400 rounded-sm">
                      {template.widget_count} widgets
                    </span>
                  </div>
                </div>

                {/* Confirmation inline dialog */}
                {isConfirming ? (
                  <div className="mt-3 pt-3 border-t border-yellow-600/40 bg-yellow-900/10 rounded-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={12} className="text-yellow-500" />
                      <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest font-semibold">
                        Confirmar
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-300 mb-3 leading-relaxed">
                      Esto reemplazará la configuración actual del dashboard. Los cambios no guardados se perderán.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmApply(template.slug)}
                        disabled={isApplying}
                        className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600/30 border border-yellow-600/60 rounded-sm text-[10px] font-mono text-yellow-300 hover:bg-yellow-600/40 hover:border-yellow-500 transition-colors disabled:opacity-50"
                      >
                        {isApplying ? 'Aplicando...' : 'Sí, aplicar'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isApplying}
                        className="px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-sm text-[10px] font-mono text-zinc-400 hover:bg-zinc-700/80 hover:border-zinc-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  !isActive && (
                    <button
                      onClick={() => handleApplyClick(template.slug)}
                      disabled={isApplying}
                      className="mt-3 w-full px-3 py-2 bg-[#E31E24]/20 border border-[#E31E24]/50 rounded-sm text-[10px] font-mono text-[#E31E24] hover:bg-[#E31E24]/30 hover:border-[#E31E24]/70 hover:shadow-lg hover:shadow-[#E31E24]/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                      {isApplying ? 'Aplicando...' : 'Aplicar template'}
                    </button>
                  )
                )}

                {/* Apply error message */}
                {applyError && isConfirming && (
                  <div className="mt-2 text-[9px] font-mono text-red-400">
                    {applyError}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Apply success message */}
      {applySuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-900/30 border border-green-700/50 rounded-sm text-[11px] font-mono text-green-400 shadow-lg shadow-green-900/20">
          <Check size={14} />
          <span className="font-semibold">{applySuccess}</span>
        </div>
      )}

      {/* Global apply error */}
      {applyError && !showConfirm && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-sm text-[11px] font-mono text-red-400">
          <AlertTriangle size={14} />
          <span>{applyError}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && templates.length === 0 && (
        <div className="text-center py-6">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            No hay templates disponibles
          </p>
        </div>
      )}
    </div>
  )
}