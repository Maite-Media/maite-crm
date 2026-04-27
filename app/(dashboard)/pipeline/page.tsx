import { getOpportunitiesByStage } from '@/lib/actions/opportunities'
import { getContacts } from '@/lib/actions/leads'
import { getCompanies } from '@/lib/actions/companies'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/pipeline/kanban-board'

async function getServices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) return []
  return data ?? []
}

export default async function PipelinePage() {
  const [opportunitiesResult, contactsResult, companiesResult] = await Promise.all([
    getOpportunitiesByStage(),
    getContacts(),
    getCompanies(),
  ])

  const services = await getServices()
  const pipelineData = opportunitiesResult.success ? opportunitiesResult.data : null
  const stages = pipelineData?.stages ?? []
  const opportunities = pipelineData?.opportunities ?? []
  const contacts = contactsResult.success ? contactsResult.data ?? [] : []
  const companies = companiesResult.success ? companiesResult.data ?? [] : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-8 bg-[#E31E24]" style={{ boxShadow: '0 0 8px rgba(227,30,36,0.6)' }} />
        <div>
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Módulo 04</p>
          <h1 className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-snug" style={{ textShadow: '0 0 16px rgba(227,30,36,0.25)' }}>
            Pipeline
          </h1>
        </div>
        <div className="ml-auto">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            {opportunities.length} oportunidades / {stages.length} etapas
          </span>
        </div>
      </div>

      <KanbanBoard
        stages={stages}
        opportunities={opportunities}
        contacts={contacts.map((c: { id: string; first_name: string; last_name: string | null }) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
        }))}
        companies={companies.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }))}
        services={services.map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
        }))}
      />
    </div>
  )
}
