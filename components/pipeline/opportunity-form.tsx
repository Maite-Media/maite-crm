'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createOpportunity, updateOpportunity } from '@/lib/actions/opportunities'
import type { Opportunity, OpportunityWithRelations } from '@/lib/actions/opportunities'

interface OpportunityFormProps {
  opportunity?: OpportunityWithRelations
  stageId?: string
  contacts?: Array<{ id: string; first_name: string; last_name: string | null }>
  companies?: Array<{ id: string; name: string }>
  services?: Array<{ id: string; name: string }>
  stages?: Array<{ id: string; name: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function OpportunityForm({
  opportunity,
  stageId,
  contacts = [],
  companies = [],
  services = [],
  stages = [],
  onSuccess,
  onCancel,
}: OpportunityFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(opportunity?.title ?? '')
  const [contactId, setContactId] = useState(opportunity?.contact_id ?? '')
  const [companyId, setCompanyId] = useState(opportunity?.company_id ?? '')
  const [selectedServices, setSelectedServices] = useState<string[]>(
    opportunity?.services?.map(s => s.id) ?? []
  )
  const [stage, setStage] = useState(opportunity?.stage_id ?? stageId ?? '')
  const [estimatedValue, setEstimatedValue] = useState(
    opportunity?.estimated_value?.toString() ?? ''
  )
  const [closeProbability, setCloseProbability] = useState(
    opportunity?.close_probability?.toString() ?? ''
  )
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    opportunity?.expected_close_date ?? ''
  )
  const [notes, setNotes] = useState(opportunity?.notes ?? '')

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
        contact_id: contactId || undefined,
        company_id: companyId || undefined,
        stage_id: stage || undefined,
        estimated_value: estimatedValue ? Number(estimatedValue) : undefined,
        close_probability: closeProbability ? Number(closeProbability) : undefined,
        expected_close_date: expectedCloseDate || undefined,
        notes: notes.trim() || undefined,
        service_ids: selectedServices.length > 0 ? selectedServices : undefined,
      }

      const result = opportunity
        ? await updateOpportunity(opportunity.id, data as Parameters<typeof updateOpportunity>[1])
        : await createOpportunity(data as Parameters<typeof createOpportunity>[0])

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
          placeholder="Diseño de sitio web para..."
          required
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Servicios</Label>
          <div className="space-y-2 mt-2">
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay servicios disponibles</p>
            )}
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedServices([...selectedServices, s.id])
                    } else {
                      setSelectedServices(selectedServices.filter(id => id !== s.id))
                    }
                  }}
                  className="h-4 w-4 rounded border-input"
                  disabled={isPending}
                />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="stage_id">Etapa</Label>
          <select
            id="stage_id"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
            disabled={isPending}
          >
            <option value="">Seleccionar etapa...</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="estimated_value">Valor estimado (₲)</Label>
          <Input
            id="estimated_value"
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="500000"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="close_probability">Probabilidad (%)</Label>
          <Input
            id="close_probability"
            type="number"
            min="0"
            max="100"
            value={closeProbability}
            onChange={(e) => setCloseProbability(e.target.value)}
            placeholder="50"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="expected_close_date">Fecha esperada de cierre</Label>
        <Input
          id="expected_close_date"
          type="date"
          value={expectedCloseDate}
          onChange={(e) => setExpectedCloseDate(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas sobre la oportunidad..."
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
          {isPending ? 'Guardando...' : opportunity ? 'Actualizar' : 'Crear Oportunidad'}
        </Button>
      </div>
    </form>
  )
}