'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from './status-badge'
import { CompanyForm } from './company-form'
import { CompanyDetailPanel } from './company-detail-panel'
import { getCompanies, getCompanyById } from '@/lib/actions/companies'
import { getActivitiesByCompany } from '@/lib/actions/activities'
import type { CompanyWithRelations } from '@/lib/actions/companies'
import type { Activity } from '@/lib/actions/activities'

interface CompanyTableProps {
  initialCompanies: CompanyWithRelations[]
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'prospect', label: 'Prospecto' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'lost', label: 'Perdido' },
]

export function CompanyTable({ initialCompanies }: CompanyTableProps) {
  const [companies, setCompanies] = useState<CompanyWithRelations[]>(initialCompanies)
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithRelations | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const filteredCompanies = companies.filter((company) => {
    if (filterStatus && company.status !== filterStatus) return false
    return true
  })

  function handleCompanyClick(company: CompanyWithRelations) {
    startTransition(async () => {
      const [companyResult, activitiesResult] = await Promise.all([
        getCompanyById(company.id),
        getActivitiesByCompany(company.id),
      ])

      if (companyResult.success && companyResult.data) {
        setSelectedCompany(companyResult.data as CompanyWithRelations)
      }
      if (activitiesResult.success) {
        setSelectedActivities(activitiesResult.data ?? [])
      }
      setIsPanelOpen(true)
    })
  }

  function handleFormSuccess() {
    setIsDialogOpen(false)
    startTransition(async () => {
      const result = await getCompanies()
      if (result.success) {
        setCompanies((result.data as CompanyWithRelations[]) ?? [])
      }
    })
  }

  function handlePanelDeleted() {
    startTransition(async () => {
      const result = await getCompanies()
      if (result.success) {
        setCompanies((result.data as CompanyWithRelations[]) ?? [])
      }
    })
  }

  function handlePanelUpdated() {
    startTransition(async () => {
      const result = await getCompanies()
      if (result.success) {
        setCompanies((result.data as CompanyWithRelations[]) ?? [])
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="filter-status" className="text-xs">Estado</Label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full sm:w-auto cursor-pointer">
            Nueva Empresa
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Empresa</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <CompanyForm
                onSuccess={handleFormSuccess}
                onCancel={() => setIsDialogOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Contactos</TableHead>
              <TableHead>Oportunidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {isPending ? 'Cargando...' : 'No hay empresas disponibles'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => {
                const contactCount = company.contacts?.length ?? 0
                const opportunityCount = company.opportunities?.length ?? 0
                return (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer"
                    onClick={() => handleCompanyClick(company)}
                  >
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.industry ?? '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={company.status} />
                    </TableCell>
                    <TableCell>
                      {contactCount > 0 ? contactCount : 'Sin datos'}
                    </TableCell>
                    <TableCell>
                      {opportunityCount > 0 ? opportunityCount : 'Sin datos'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedCompany && (
        <CompanyDetailPanel
          company={selectedCompany}
          activities={selectedActivities}
          open={isPanelOpen}
          onOpenChange={setIsPanelOpen}
          onDeleted={handlePanelDeleted}
          onUpdated={handlePanelUpdated}
        />
      )}
    </div>
  )
}
