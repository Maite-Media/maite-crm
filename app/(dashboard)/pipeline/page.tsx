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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">
          Kanban de oportunidades comerciales
        </p>
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