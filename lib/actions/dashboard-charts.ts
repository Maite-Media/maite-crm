'use server'
import { createClient } from '@/lib/supabase/server'

// Retorna ingresos ganados por mes, últimos 6 meses
export async function getRevenueByMonth() {
  const supabase = await createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await supabase
    .from('opportunities')
    .select('estimated_value, updated_at, pipeline_stages!opportunities_stage_id_fkey(is_won)')
    .gte('updated_at', sixMonthsAgo.toISOString())
    .is('deleted_at', null)

  // Agrupar por mes
  const months: Record<string, number> = {}
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
    months[key] = 0
  }

  data?.forEach(opp => {
    const stage = opp.pipeline_stages as { is_won?: boolean } | null
    if (stage?.is_won) {
      const d = new Date(opp.updated_at)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
      if (months[key] !== undefined) {
        months[key] += Number(opp.estimated_value) || 0
      }
    }
  })

  return Object.entries(months).map(([month, value]) => ({ month, value }))
}

// Retorna cantidad de oportunidades por etapa
export async function getOpportunitiesByStageCount() {
  const supabase = await createClient()

  // Get authenticated user and workspace
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return []

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, position, is_won, is_lost')
    .eq('workspace_id', member.workspace_id)
    .order('position')

  const stageIds = stages?.map(s => s.id) ?? []

  // Early return if no stages
  if (stageIds.length === 0) {
    return []
  }

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('stage_id')
    .in('stage_id', stageIds)
    .is('deleted_at', null)

  return stages?.map(stage => ({
    name: stage.name,
    count: opportunities?.filter(o => o.stage_id === stage.id).length || 0,
    is_won: stage.is_won,
    is_lost: stage.is_lost,
  })) || []
}

// Retorna leads agrupados por fuente
export async function getLeadsBySource() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select('source')
    .is('deleted_at', null)

  const sourceLabels: Record<string, string> = {
    web: 'Web',
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
    referral: 'Referido',
    ad: 'Anuncio',
    call: 'Llamada',
    other: 'Otro',
  }

  const counts: Record<string, number> = {}
  data?.forEach(contact => {
    const source = contact.source || 'other'
    counts[source] = (counts[source] || 0) + 1
  })

  return Object.entries(counts).map(([source, value]) => ({
    name: sourceLabels[source] || source,
    value,
  }))
}