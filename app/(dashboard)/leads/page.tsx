import { getContacts } from '@/lib/actions/leads'
import { LeadTable } from '@/components/leads/lead-table'
import type { ContactWithRelations } from '@/lib/actions/leads'

export default async function LeadsPage() {
  const result = await getContacts()
  const contacts = (result.success ? result.data : []) as ContactWithRelations[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground">
          Gestión de contactos y leads
        </p>
      </div>

      <LeadTable initialContacts={contacts} />
    </div>
  )
}