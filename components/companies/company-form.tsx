'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createCompany, updateCompany } from '@/lib/actions/companies'
import type { Company } from '@/lib/actions/companies'

interface CompanyFormProps {
  company?: Company
  onSuccess?: () => void
  onCancel?: () => void
}

const SIZE_OPTIONS = [
  { value: '', label: 'Seleccionar...' },
  { value: '1-5', label: '1-5 empleados' },
  { value: '6-20', label: '6-20 empleados' },
  { value: '21-100', label: '21-100 empleados' },
  { value: '100+', label: '100+ empleados' },
]

const STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospecto' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'lost', label: 'Perdido' },
]

export function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(company?.name ?? '')
  const [industry, setIndustry] = useState(company?.industry ?? '')
  const [website, setWebsite] = useState(company?.website ?? '')
  const [instagram, setInstagram] = useState(company?.instagram ?? '')
  const [facebook, setFacebook] = useState(company?.facebook ?? '')
  const [phone, setPhone] = useState(company?.phone ?? '')
  const [email, setEmail] = useState(company?.email ?? '')
  const [address, setAddress] = useState(company?.address ?? '')
  const [size, setSize] = useState(company?.size ?? '')
  const [status, setStatus] = useState(company?.status ?? 'prospect')
  const [notes, setNotes] = useState(company?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    startTransition(async () => {
      const data = {
        name: name.trim(),
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        size: size || undefined,
        status: status || undefined,
        notes: notes.trim() || undefined,
      }

      const result = company
        ? await updateCompany(company.id, data as Partial<Company>)
        : await createCompany(data as Parameters<typeof createCompany>[0])

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
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la empresa"
          required
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="industry">Rubro</Label>
          <Input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Ej: Tecnología"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="size">Tamaño</Label>
          <select
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base"
            disabled={isPending}
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://empresa.com"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@empresa"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="facebook">Facebook</Label>
          <Input
            id="facebook"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="empresa"
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
            placeholder="contacto@empresa.com"
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
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Av. España 1234, Asunción"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="status">Estado</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'prospect' | 'active' | 'paused' | 'lost')}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base"
          disabled={isPending}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales sobre la empresa..."
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
          {isPending ? 'Guardando...' : company ? 'Actualizar' : 'Crear Empresa'}
        </Button>
      </div>
    </form>
  )
}
