'use client'

import { useState } from 'react'
import {
  createService,
  updateService,
  deleteService,
  getServices,
  Service
} from '@/lib/actions/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PencilIcon, TrashIcon, PlusIcon } from 'lucide-react'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  one_time: 'Una vez',
  monthly: 'Mensual',
  recurring: 'Recurrente',
}

const SERVICE_TYPE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  one_time: 'default',
  monthly: 'secondary',
  recurring: 'outline',
}

function formatPrice(amount: number | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
  }).format(amount)
}

type ServiceFormData = {
  name: string
  description: string
  base_price: string
  type: 'one_time' | 'monthly' | 'recurring'
}

const emptyForm: ServiceFormData = {
  name: '',
  description: '',
  base_price: '',
  type: 'one_time',
}

export function ServicesManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState<ServiceFormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; service: Service | null }>({
    open: false,
    service: null,
  })

  function openCreate() {
    setEditingService(null)
    setFormData(emptyForm)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(service: Service) {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      base_price: service.base_price?.toString() || '',
      type: service.type || 'one_time',
    })
    setError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      base_price: formData.base_price ? parseFloat(formData.base_price) : undefined,
      type: formData.type,
    }

    let result
    if (editingService) {
      result = await updateService(editingService.id, data)
    } else {
      result = await createService(data)
    }

    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Error desconocido')
      return
    }

    setDialogOpen(false)
    const listResult = await getServices()
    if (listResult.success) {
      setServices(listResult.data || [])
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteService(id)
    setDeleteConfirm({ open: false, service: null })
    if (result.success) {
      const listResult = await getServices()
      if (listResult.success) {
        setServices(listResult.data || [])
      }
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Servicios</CardTitle>
              <CardDescription>Productos y servicios ofrecidos</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer" onClick={openCreate}>
                <PlusIcon className="size-4" />
                Agregar
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Editar servicio' : 'Nuevo servicio'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingService
                      ? 'Modifica los datos del servicio'
                      : 'Agrega un nuevo servicio o producto'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del servicio"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción opcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_price">Precio base (₲)</Label>
                    <Input
                      id="base_price"
                      type="number"
                      min="0"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <select
                      id="type"
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as ServiceFormData['type'],
                        })
                      }
                    >
                      <option value="one_time">Una vez</option>
                      <option value="monthly">Mensual</option>
                      <option value="recurring">Recurrente</option>
                    </select>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay servicios configurados
            </p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{service.name}</span>
                      <Badge
                        variant={SERVICE_TYPE_COLORS[service.type || 'one_time']}
                        className="text-xs"
                      >
                        {SERVICE_TYPE_LABELS[service.type || 'one_time']}
                      </Badge>
                    </div>
                    {service.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {service.description}
                      </p>
                    )}
                    <p className="text-sm font-medium mt-1">
                      {formatPrice(service.base_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(service)}>
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteConfirm({ open: true, service })}
                    >
                      <TrashIcon className="size-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, service: deleteConfirm.service })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar servicio</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar &quot;{deleteConfirm.service?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, service: null })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm.service && handleDelete(deleteConfirm.service.id)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}