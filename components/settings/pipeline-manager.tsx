'use client'

import { useState } from 'react'
import {
  getPipelineStages,
  updatePipelineStage,
  reorderPipelineStages,
  PipelineStage
} from '@/lib/actions/pipeline-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GripIcon } from 'lucide-react'

export function PipelineManager({ initialStages }: { initialStages: PipelineStage[] }) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleUpdateStage(id: string, data: { name?: string; color?: string }) {
    const result = await updatePipelineStage(id, data)
    if (!result.success) {
      setError(result.error || 'Error al actualizar')
      return
    }
    const listResult = await getPipelineStages()
    if (listResult.success) {
      setStages(listResult.data || [])
    }
  }

  async function handleSaveOrder() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const reordered = stages.map((stage, index) => ({
      id: stage.id,
      position: index + 1,
    }))

    const result = await reorderPipelineStages(reordered)
    setLoading(false)

    if (!result.success) {
      setError('Error al reordenar')
      return
    }
    setSuccess(true)
    const listResult = await getPipelineStages()
    if (listResult.success) {
      setStages(listResult.data || [])
    }
  }

  function moveStage(index: number, direction: 'up' | 'down') {
    const newStages = [...stages]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newStages.length) return

    const temp = newStages[index]
    newStages[index] = newStages[targetIndex]
    newStages[targetIndex] = temp
    setStages(newStages)
    setSuccess(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
        <CardDescription>
          Configura las etapas del pipeline. Usa las flechas para reordenar y guarda los cambios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Cambios guardados</p>}

        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full cursor-pointer hover:bg-muted"
                   onClick={() => index > 0 && moveStage(index, 'up')}>
                <GripIcon className="size-4 text-muted-foreground" />
              </div>

              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />

              <div className="flex-1 min-w-0">
                <Input
                  value={stage.name}
                  onChange={(e) => {
                    const newStages = [...stages]
                    newStages[index] = { ...newStages[index], name: e.target.value }
                    setStages(newStages)
                    setSuccess(false)
                  }}
                  onBlur={() => handleUpdateStage(stage.id, { name: stage.name })}
                  className="font-medium"
                />
              </div>

              <Input
                type="color"
                value={stage.color}
                onChange={(e) => {
                  const newStages = [...stages]
                  newStages[index] = { ...newStages[index], color: e.target.value }
                  setStages(newStages)
                  setSuccess(false)
                }}
                onBlur={() => handleUpdateStage(stage.id, { color: stage.color })}
                className="w-12 h-8 p-1 cursor-pointer"
              />

              <span className="text-xs text-muted-foreground w-6 text-center">
                #{stage.position}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => moveStage(index, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => moveStage(index, 'down')}
                  disabled={index === stages.length - 1}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSaveOrder} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar orden'}
        </Button>
      </CardContent>
    </Card>
  )
}