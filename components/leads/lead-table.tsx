'use client'

import { useState, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InterestBadge } from './interest-badge'
import { LeadForm } from './lead-form'
import { LeadDetailPanel } from './lead-detail-panel'
import { getContacts, getContactById } from '@/lib/actions/leads'
import { getActivitiesByContact } from '@/lib/actions/activities'
import { getTasksByContact } from '@/lib/actions/tasks'
import { cn } from '@/lib/utils'
import type { ContactWithRelations } from '@/lib/actions/leads'
import type { Activity } from '@/lib/actions/activities'
import type { Task } from '@/lib/actions/tasks'

interface LeadTableProps {
  initialContacts: ContactWithRelations[]
}

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas las fuentes' },
  { value: 'web', label: 'Web' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'referral', label: 'Referido' },
  { value: 'ad', label: 'Publicidad' },
  { value: 'call', label: 'Llamada' },
  { value: 'other', label: 'Otro' },
]

const INTEREST_OPTIONS = [
  { value: '', label: 'Todos los niveles' },
  { value: 'cold', label: 'Frío' },
  { value: 'warm', label: 'Tibio' },
  { value: 'hot', label: 'Caliente' },
]

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'short',
  })
}

export function LeadTable({ initialContacts }: LeadTableProps) {
  const [contacts, setContacts] = useState<ContactWithRelations[]>(initialContacts)
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactWithRelations | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const [filterInterest, setFilterInterest] = useState('')
  const [filterSource, setFilterSource] = useState('')

  const filteredContacts = contacts.filter((contact) => {
    if (filterInterest && contact.interest_level !== filterInterest) return false
    if (filterSource && contact.source !== filterSource) return false
    return true
  })

  function handleContactClick(contact: ContactWithRelations) {
    startTransition(async () => {
      const [contactResult, activitiesResult, tasksResult] = await Promise.all([
        getContactById(contact.id),
        getActivitiesByContact(contact.id),
        getTasksByContact(contact.id),
      ])

      if (contactResult.success && contactResult.data) {
        setSelectedContact(contactResult.data as ContactWithRelations)
      }
      if (activitiesResult.success) {
        setSelectedActivities(activitiesResult.data ?? [])
      }
      if (tasksResult.success) {
        setSelectedTasks(tasksResult.data ?? [])
      }
      setIsPanelOpen(true)
    })
  }

  function handleFormSuccess() {
    setIsDialogOpen(false)
    startTransition(async () => {
      const result = await getContacts()
      if (result.success) {
        setContacts((result.data as ContactWithRelations[]) ?? [])
      }
    })
  }

  function handlePanelDeleted() {
    startTransition(async () => {
      const result = await getContacts()
      if (result.success) {
        setContacts((result.data as ContactWithRelations[]) ?? [])
      }
    })
  }

  function handlePanelUpdated() {
    startTransition(async () => {
      const result = await getContacts()
      if (result.success) {
        setContacts((result.data as ContactWithRelations[]) ?? [])
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="filter-interest" className="text-xs">Nivel de interés</Label>
            <select
              id="filter-interest"
              value={filterInterest}
              onChange={(e) => setFilterInterest(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {INTEREST_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="filter-source" className="text-xs">Fuente</Label>
            <select
              id="filter-source"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full sm:w-auto cursor-pointer">
            Nuevo Lead
          </DialogTrigger>
          <DialogContent className="w-full max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle>Nuevo Lead</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <LeadForm
                onSuccess={handleFormSuccess}
                onCancel={() => setIsDialogOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Interés</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isPending ? 'Cargando...' : 'No hay leads disponibles'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => {
                  const fullName = `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}`
                  return (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      onClick={() => handleContactClick(contact)}
                    >
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell>{contact.companies?.name ?? '-'}</TableCell>
                      <TableCell className="capitalize">{contact.source ?? '-'}</TableCell>
                      <TableCell>
                        <InterestBadge level={contact.interest_level} />
                      </TableCell>
                      <TableCell>{contact.profiles?.full_name ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(contact.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden divide-y">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isPending ? 'Cargando...' : 'No hay leads disponibles'}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const fullName = `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}`
              return (
                <div
                  key={contact.id}
                  className="p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.companies?.name ?? 'Sin empresa'}
                      </p>
                    </div>
                    <InterestBadge level={contact.interest_level} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="capitalize">{contact.source ?? '-'}</span>
                    <span>•</span>
                    <span>{formatDate(contact.created_at)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {selectedContact && (
        <LeadDetailPanel
          contact={selectedContact}
          activities={selectedActivities}
          tasks={selectedTasks}
          open={isPanelOpen}
          onOpenChange={setIsPanelOpen}
          onDeleted={handlePanelDeleted}
          onUpdated={handlePanelUpdated}
        />
      )}
    </div>
  )
}