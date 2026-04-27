import { getContacts } from '@/lib/actions/leads'
import { LeadTable } from '@/components/leads/lead-table'
import type { ContactWithRelations } from '@/lib/actions/leads'

export default async function LeadsPage() {
  const result = await getContacts()
  const contacts = (result.success ? result.data : []) as ContactWithRelations[]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-8 bg-[#E31E24]" style={{ boxShadow: '0 0 8px rgba(227,30,36,0.6)' }} />
        <div>
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Módulo 02</p>
          <h1 className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-snug" style={{ textShadow: '0 0 16px rgba(227,30,36,0.25)' }}>
            Leads
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            {contacts.length} registros
          </span>
        </div>
      </div>
      <LeadTable initialContacts={contacts} />
    </div>
  )
}
