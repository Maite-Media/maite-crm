'use client'

import { useState, useTransition, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createContact, updateContact } from '@/lib/actions/leads'
import { getCompanies } from '@/lib/actions/companies'
import type { Contact } from '@/lib/actions/leads'
import type { Company } from '@/lib/actions/companies'

interface LeadFormProps {
  contact?: Contact
  onSuccess?: () => void
  onCancel?: () => void
}

const SOURCE_OPTIONS = [
  { value: 'web', label: 'Web' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'referral', label: 'Referido' },
  { value: 'ad', label: 'Publicidad' },
  { value: 'call', label: 'Llamada' },
  { value: 'other', label: 'Otro' },
]

const INTEREST_OPTIONS = [
  { value: 'cold', label: 'Frío' },
  { value: 'warm', label: 'Tibio' },
  { value: 'hot', label: 'Caliente' },
]

export function LeadForm({ contact, onSuccess, onCancel }: LeadFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  const [firstName, setFirstName] = useState(contact?.first_name ?? '')
  const [lastName, setLastName] = useState(contact?.last_name ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(contact?.whatsapp ?? '')
  const [companyId, setCompanyId] = useState<string>(contact?.company_id ?? '')
  const [position, setPosition] = useState(contact?.position ?? '')
  const [source, setSource] = useState(contact?.source ?? '')
  const [interestLevel, setInterestLevel] = useState(contact?.interest_level ?? 'cold')
  const [estimatedBudget, setEstimatedBudget] = useState(
    contact?.estimated_budget?.toString() ?? ''
  )
  const [notes, setNotes] = useState(contact?.notes ?? '')

  useEffect(() => {
    getCompanies().then((result) => {
      if (result.success && result.data) {
        setCompanies(result.data)
      }
    })
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim()) {
      setError('El nombre es requerido')
      return
    }

    startTransition(async () => {
      const data = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        company_id: companyId || undefined,
        position: position.trim() || undefined,
        source: source || undefined,
        interest_level: interestLevel || undefined,
        estimated_budget: estimatedBudget ? Number(estimatedBudget) : undefined,
        notes: notes.trim() || undefined,
      }

      const result = contact
        ? await updateContact(contact.id, data as Partial<Contact>)
        : await createContact(data as Parameters<typeof createContact>[0])

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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="first_name">Nombre *</Label>
          <Input
            id="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Juan"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="last_name">Apellido</Label>
          <Input
            id="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Pérez"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@empresa.com"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+595 21 123 456"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+595 991 234 567"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="company_id">Empresa</Label>
        <Select
          value={companyId}
          onValueChange={(value) => setCompanyId(value === '__none__' ? '' : (value ?? ''))}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin empresa">
              {companyId && companyId !== '__none__'
                ? companies.find((c) => c.id === companyId)?.name || companyId
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin empresa</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name || 'Sin nombre'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="position">Cargo</Label>
        <Input
          id="position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Gerente de Marketing"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="source">Fuente</Label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base"
            disabled={isPending}
          >
            <option value="">Seleccionar...</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="interest_level">Nivel de interés</Label>
          <select
            id="interest_level"
            value={interestLevel}
            onChange={(e) => setInterestLevel(e.target.value as 'cold' | 'warm' | 'hot')}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base"
            disabled={isPending}
          >
            {INTEREST_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="estimated_budget">Presupuesto estimado</Label>
        <Input
          id="estimated_budget"
          type="number"
          value={estimatedBudget}
          onChange={(e) => setEstimatedBudget(e.target.value)}
          placeholder="500000"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales sobre el lead..."
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base min-h-[80px]"
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
          {isPending ? 'Guardando...' : contact ? 'Actualizar' : 'Crear Lead'}
        </Button>
      </div>
    </form>
  )
}