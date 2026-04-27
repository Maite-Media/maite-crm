'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge } from './status-badge'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { CompanyForm } from './company-form'
import { deleteCompany } from '@/lib/actions/companies'
import type { CompanyWithRelations } from '@/lib/actions/companies'
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
  return new Date(dateString).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SIZE_LABELS: Record<string, string> = {
  '1-5': '1-5 emp.', '6-20': '6-20 emp.', '21-100': '21-100 emp.', '100+': '100+ emp.',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-mono text-zinc-200 mt-0.5">{value}</p>
    </div>
  )
}

export function CompanyDetailPanel({ company, activities, open, onOpenChange, onDeleted, onUpdated }: CompanyDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleDelete() {
    if (!confirm('¿Eliminar esta empresa?')) return
    startTransition(async () => {
      const result = await deleteCompany(company.id)
      if (result.success) { onDeleted?.(); onOpenChange(false) }
      else alert(result.error ?? 'Error al eliminar')
    })
  }

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="font-mono font-bold uppercase tracking-wider text-white">Editar Empresa</DialogTitle>
            <DialogDescription className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Actualiza los datos de la empresa</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <CompanyForm company={company} onSuccess={() => { setIsEditing(false); onUpdated?.() }} onCancel={() => setIsEditing(false)} />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ border: '1px solid rgba(227,30,36,0.15)' }}>
        <div className="absolute top-0 left-1/4 right-1/4 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(227,30,36,0.5), transparent)' }} />

        <DialogHeader className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <div className="w-0.5 h-5 bg-[#E31E24] mt-0.5 shrink-0" style={{ boxShadow: '0 0 6px rgba(227,30,36,0.5)' }} />
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-none mb-1">Empresa</p>
                <DialogTitle className="text-base font-mono font-bold uppercase tracking-wider text-white leading-snug">{company.name}</DialogTitle>
                {company.industry && <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{company.industry}</p>}
              </div>
            </div>
            <StatusBadge status={company.status} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="detail" className="mt-4">
          <TabsList className="w-full font-mono">
            <TabsTrigger value="detail" className="flex-1 text-[10px] uppercase tracking-wider">Detalle</TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1 text-[10px] uppercase tracking-wider">Contactos</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-[10px] uppercase tracking-wider">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {company.website && <Field label="Website" value={company.website} />}
              {company.email && <Field label="Email" value={company.email} />}
              {company.phone && <Field label="Teléfono" value={company.phone} />}
              {company.instagram && <Field label="Instagram" value={company.instagram} />}
              {company.facebook && <Field label="Facebook" value={company.facebook} />}
              {company.address && <Field label="Dirección" value={company.address} />}
              {company.size && <Field label="Tamaño" value={SIZE_LABELS[company.size] ?? company.size} />}
            </div>

            {company.notes && (
              <div>
                <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Notas</p>
                <p className="text-[11px] font-mono text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed">{company.notes}</p>
              </div>
            )}

            <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Field label="Creado" value={formatDate(company.created_at)} />
              {company.profiles && <Field label="Responsable" value={company.profiles.full_name} />}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            {!company.contacts || company.contacts.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-700 text-center py-4 uppercase tracking-wider">Sin contactos</p>
            ) : (
              <div className="space-y-1">
                {company.contacts.map((contact) => (
                  <div key={contact.id} className="px-3 py-2.5" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <p className="text-[11px] font-mono text-zinc-200 font-bold">{contact.first_name} {contact.last_name ?? ''}</p>
                    {contact.email && <p className="text-[9px] font-mono text-zinc-600 mt-0.5">{contact.email}</p>}
                    {contact.phone && <p className="text-[9px] font-mono text-zinc-600">{contact.phone}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed activities={activities} companyId={company.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-300 transition-colors hover:text-white disabled:opacity-40"
            style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', background: 'transparent' }}
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: '#E31E24', borderRadius: '2px', boxShadow: '0 0 12px rgba(227,30,36,0.3)' }}
          >
            {isPending ? '...' : 'Eliminar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
