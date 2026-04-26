'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardMetrics(userId?: string) {
  const supabase = await createClient()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Leads nuevos en 7 días
  const { count: newLeads, error: leadsError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)

  console.log('[getDashboardMetrics] newLeads:', newLeads, 'leadsError:', leadsError)

  // Oportunidades activas (no ganado, no perdido) - usando subquery para evitar FK ambigua
  const { data: opportunities, error: oppError } = await supabase
    .from('opportunities')
    .select('*, pipeline_stages!opportunities_stage_id_fkey(is_won, is_lost)')

  console.log('[getDashboardMetrics] opportunities count:', opportunities?.length)
  console.log('[getDashboardMetrics] oppError:', JSON.stringify(oppError))

  const activeOpportunities = opportunities?.filter(
    opp => !opp.pipeline_stages?.is_won && !opp.pipeline_stages?.is_lost
  ).length || 0

  // Ingresos estimados del pipeline (solo etapas no perdidas)
  const estimatedRevenue = opportunities?.reduce((sum, opp) => {
    if (!opp.pipeline_stages?.is_lost && opp.estimated_value) {
      return sum + Number(opp.estimated_value)
    }
    return sum
  }, 0) || 0

  // Tareas pendientes: status = 'pending' OR status = 'in_progress'
  let tasksQuery = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  if (userId) {
    tasksQuery = tasksQuery.eq('assigned_to', userId)
  }

  // Filter: pending OR in_progress
  const { count: pendingTasks, error: tasksError } = await tasksQuery
    .in('status', ['pending', 'in_progress'])

  console.log('[getDashboardMetrics] pendingTasks:', pendingTasks, 'tasksError:', tasksError)

  return {
    success: true,
    data: { newLeads: newLeads || 0, activeOpportunities, estimatedRevenue, pendingTasks: pendingTasks || 0 }
  }
}

export async function getRecentTasks(userId: string, limit = 8) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, contacts(first_name, last_name), companies(name), opportunities(title), profiles!tasks_assigned_to_fkey(full_name)')
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(limit)
  console.log('[getRecentTasks] data:', data?.length, 'error:', error)
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getRecentActivities(limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles!activities_created_by_fkey(full_name), contacts(first_name, last_name), companies(name), opportunities(title)')
    .order('created_at', { ascending: false })
    .limit(limit)
  console.log('[getRecentActivities] data:', data?.length, 'error:', error)
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getPipelineSummary() {
  const supabase = await createClient()

  // Get all stages with their opportunities
  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, is_won, is_lost')
    .order('position', { ascending: true })

  const { data: opportunities, error: oppError } = await supabase
    .from('opportunities')
    .select('stage_id, estimated_value, pipeline_stages!opportunities_stage_id_fkey(name, is_won, is_lost)')

  console.log('[getPipelineSummary] stages:', stages?.length, 'opportunities:', opportunities?.length)
  console.log('[getPipelineSummary] stagesError:', stagesError, 'oppError:', oppError)

  if (stagesError || oppError) return { success: false, error: stagesError?.message || oppError?.message }

  // Calculate value per stage
  const stageValues = stages?.map(stage => {
    const stageOpps = opportunities?.filter(opp => opp.stage_id === stage.id) || []
    const totalValue = stageOpps.reduce((sum, opp) => sum + (Number(opp.estimated_value) || 0), 0)
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      is_won: stage.is_won,
      is_lost: stage.is_lost,
      totalValue,
      count: stageOpps.length,
    }
  }) || []

  return { success: true, data: stageValues }
}