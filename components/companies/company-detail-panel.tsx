'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge } from './status-badge'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { CompanyForm } from './company-form'
import { deleteCompany } from '@/lib/actions/companies'
import type { Company, CompanyWithRelations } from '@/lib/actions/companies'
import type { Activity } from '@/lib/actions/activities'

interface CompanyDetailPanelProps {
  company: CompanyWithRelations
  activities: Activity[]
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

const SIZE_LABELS: Record<string, string> = {
  '1-5': '1-5 empleados',
  '6-20': '6-20 empleados',
  '21-100': '21-100 empleados',
  '100+': '100+ empleados',
}

export function CompanyDetailPanel({
  company,
  activities,
  open,
  onOpenChange,
  onDeleted,
  onUpdated,
}: CompanyDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar esta empresa?')) return

    startTransition(async () => {
      const result = await deleteCompany(company.id)
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
            <SheetTitle>Editar Empresa</SheetTitle>
            <SheetDescription>
              Actualiza los datos de la empresa
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CompanyForm
              company={company}
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
              <SheetTitle className="text-xl">{company.name}</SheetTitle>
              {company.industry && (
                <p className="text-sm text-muted-foreground mt-1">
                  {company.industry}
                </p>
              )}
            </div>
            <StatusBadge status={company.status} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="detail" className="flex-1">Detalle</TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">Contactos</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {company.website && (
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="text-sm">{company.website}</p>
                </div>
              )}
              {company.email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{company.email}</p>
                </div>
              )}
              {company.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm">{company.phone}</p>
                </div>
              )}
              {company.instagram && (
                <div>
                  <p className="text-xs text-muted-foreground">Instagram</p>
                  <p className="text-sm">{company.instagram}</p>
                </div>
              )}
              {company.facebook && (
                <div>
                  <p className="text-xs text-muted-foreground">Facebook</p>
                  <p className="text-sm">{company.facebook}</p>
                </div>
              )}
              {company.address && (
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="text-sm">{company.address}</p>
                </div>
              )}
              {company.size && (
                <div>
                  <p className="text-xs text-muted-foreground">Tamaño</p>
                  <p className="text-sm">{SIZE_LABELS[company.size] ?? company.size}</p>
                </div>
              )}
            </div>

            {company.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">Información</p>
              <p className="text-sm">Creado: {formatDate(company.created_at)}</p>
              {company.profiles && (
                <p className="text-sm">Responsable: {company.profiles.full_name}</p>
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

          <TabsContent value="contacts" className="mt-4">
            {!company.contacts || company.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin contactos asociados
              </p>
            ) : (
              <div className="space-y-2">
                {company.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 rounded-lg border bg-card text-card-foreground"
                  >
                    <p className="text-sm font-medium">
                      {contact.first_name} {contact.last_name ?? ''}
                    </p>
                    {contact.email && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.email}
                      </p>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-muted-foreground">
                        {contact.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed
              activities={activities}
              companyId={company.id}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
