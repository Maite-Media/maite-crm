import { getWorkspaceOpportunitiesByStage } from '@/lib/actions/pipeline-actions'
import { getContacts } from '@/lib/actions/leads'
import { getCompanies } from '@/lib/actions/companies'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { AlertCircle } from 'lucide-react'

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

function NoWorkspaceError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-lg font-mono font-bold text-white mb-2">No tenés acceso al pipeline</h2>
      <p className="text-sm font-mono text-zinc-400 max-w-md">{message}</p>
    </div>
  )
}

export default async function PipelinePage() {
  const [opportunitiesResult, contactsResult, companiesResult] = await Promise.all([
    getWorkspaceOpportunitiesByStage(),
    getContacts(),
    getCompanies(),
  ])

  const services = await getServices()

  if (!opportunitiesResult.success && opportunitiesResult.error) {
    const errorMsg = opportunitiesResult.error.toLowerCase()
    if (errorMsg.includes('no workspace') || errorMsg.includes('workspace')) {
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
          </div>
          <NoWorkspaceError message="No tenés un workspace asignado. Pedile al administrador que revise tu invitación." />
        </div>
      )
    }
  }

  const pipelineData = opportunitiesResult.success ? opportunitiesResult.data : null
  const rawStages = pipelineData?.stages ?? []
  const opportunities = pipelineData?.opportunities ?? []
  const contacts = contactsResult.success ? contactsResult.data ?? [] : []
  const companies = companiesResult.success ? companiesResult.data ?? [] : []

  const stages = rawStages.map(s => ({
    id: s.id,
    name: s.name,
    position: s.position,
    color: s.color ?? '#6366f1',
    is_won: s.is_won,
    is_lost: s.is_lost,
    created_at: s.created_at,
  }))

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
