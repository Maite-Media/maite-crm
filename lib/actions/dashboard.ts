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
    .is('deleted_at', null)

  // Oportunidades activas (no ganado, no perdido) - usando subquery para evitar FK ambigua
  const { data: opportunities, error: oppError } = await supabase
    .from('opportunities')
    .select('*, pipeline_stages!opportunities_stage_id_fkey(is_won, is_lost)')
    .is('deleted_at', null)

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

  // Tareas pendientes: status = 'pending' OR 'in_progress', no eliminadas
  let tasksQuery = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (userId) {
    tasksQuery = tasksQuery.eq('assigned_to', userId)
  }

  // Filter: pending OR in_progress
  const { count: pendingTasks, error: tasksError } = await tasksQuery
    .in('status', ['pending', 'in_progress'])

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
    .is('deleted_at', null)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(limit)
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
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getPipelineSummary() {
  const supabase = await createClient()

  // Get authenticated user and workspace
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { success: false, error: 'No workspace found' }

  // Get stages filtered by workspace
  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, is_won, is_lost')
    .eq('workspace_id', member.workspace_id)
    .order('position', { ascending: true })

  const stageIds = stages?.map(s => s.id) ?? []

  // Early return if no stages (no pipeline configured yet)
  if (stageIds.length === 0) {
    return { success: true, data: [] }
  }

  const { data: opportunities, error: oppError } = await supabase
    .from('opportunities')
    .select('stage_id, estimated_value')
    .in('stage_id', stageIds)
    .is('deleted_at', null)

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