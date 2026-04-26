'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Opportunity = {
  id: string
  title: string
  contact_id: string | null
  company_id: string | null
  service_id: string | null
  stage_id: string
  estimated_value: number | null
  close_probability: number | null
  expected_close_date: string | null
  assigned_to: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type OpportunityWithRelations = Opportunity & {
  contacts: { first_name: string; last_name: string | null } | null
  companies: { name: string } | null
  services: Array<{ id: string; name: string }> | null
  pipeline_stages: { name: string; color: string; is_won: boolean; is_lost: boolean } | null
  profiles: { full_name: string } | null
  created_by_profile: { full_name: string } | null
}

export async function getOpportunityServices(opportunityId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunity_services')
    .select('service_id')
    .eq('opportunity_id', opportunityId)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data?.map(r => r.service_id) ?? [] }
}

export async function addServicesToOpportunity(opportunityId: string, serviceIds: string[]) {
  const supabase = await createClient()

  // Delete existing associations
  const { error: deleteError } = await supabase
    .from('opportunity_services')
    .delete()
    .eq('opportunity_id', opportunityId)

  if (deleteError) return { success: false, error: deleteError.message }

  // Insert new associations
  if (serviceIds.length === 0) return { success: true, data: [] }

  const toInsert = serviceIds.map(service_id => ({
    opportunity_id: opportunityId,
    service_id
  }))

  const { data, error } = await supabase
    .from('opportunity_services')
    .insert(toInsert)
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function createOpportunity(data: {
  title: string
  contact_id?: string
  company_id?: string
  stage_id?: string
  estimated_value?: number
  close_probability?: number
  expected_close_date?: string
  assigned_to?: string
  notes?: string
  service_ids?: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Remove service_ids from data before inserting into opportunities
  const { service_ids, ...oppData } = data

  const { data: opp, error } = await supabase
    .from('opportunities')
    .insert({ ...oppData, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Add services if provided
  if (service_ids && service_ids.length > 0) {
    await addServicesToOpportunity(opp.id, service_ids)
  }

  await supabase.from('activities').insert({
    type: 'stage_change',
    description: 'Oportunidad creada',
    opportunity_id: opp.id,
    created_by: user.id
  })

  revalidatePath('/pipeline')
  return { success: true, data: opp }
}

export async function updateOpportunity(id: string, data: Partial<Opportunity & { service_ids?: string[] }>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Extract service_ids before updating opportunity
  const { service_ids, ...oppData } = data

  const { data: opp, error } = await supabase
    .from('opportunities')
    .update({ ...oppData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Update services if provided
  if (service_ids !== undefined) {
    await addServicesToOpportunity(id, service_ids)
  }

  revalidatePath('/pipeline')
  return { success: true, data: opp }
}

export async function moveStage(id: string, newStageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: opp } = await supabase
    .from('opportunities')
    .select('stage_id')
    .eq('id', id)
    .single()

  if (!opp) return { success: false, error: 'Oportunidad no encontrada' }

  const { data: newStage } = await supabase
    .from('pipeline_stages')
    .select('name, is_won')
    .eq('id', newStageId)
    .single()

  const { data: oldStage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', opp.stage_id)
    .single()

  const { data, error } = await supabase
    .from('opportunities')
    .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('activities').insert({
    type: 'stage_change',
    description: `Etapa cambiada de "${oldStage?.name ?? 'Desconocida'}" a "${newStage?.name ?? 'Desconocida'}"`,
    opportunity_id: id,
    created_by: user.id
  })

  // If moved to "Ganado" stage, create a project automatically
  if (newStage?.is_won) {
    // Fetch full opportunity data for project creation
    const { data: fullOpp } = await supabase
      .from('opportunities')
      .select('title, company_id, contact_id, assigned_to')
      .eq('id', id)
      .single()

    // Get first service from opportunity_services
    const { data: oppServices } = await supabase
      .from('opportunity_services')
      .select('service_id')
      .eq('opportunity_id', id)
      .limit(1)

    const serviceId = oppServices && oppServices.length > 0 ? oppServices[0].service_id : null

    if (fullOpp) {
      await supabase.from('projects').insert({
        name: fullOpp.title,
        opportunity_id: id,
        company_id: fullOpp.company_id,
        contact_id: fullOpp.contact_id,
        service_id: serviceId,
        assigned_to: fullOpp.assigned_to,
        start_date: new Date().toISOString().split('T')[0],
      })

      await supabase.from('activities').insert({
        type: 'system',
        description: 'Proyecto creado automáticamente al marcar como ganada',
        opportunity_id: id,
        created_by: user.id
      })
    }
  }

  revalidatePath('/pipeline')
  return { success: true, data }
}

export async function getOpportunitiesByStage() {
  const supabase = await createClient()

  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('position', { ascending: true })

  if (stagesError) return { success: false, error: stagesError.message }

  const { data: opportunities, error: opportunitiesError } = await supabase
    .from('opportunities')
    .select('*, contacts(first_name, last_name), companies(name), profiles!opportunities_assigned_to_fkey(full_name), created_by_profile:profiles!opportunities_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (opportunitiesError) {
    console.log('[getOpportunitiesByStage] opportunitiesError:', JSON.stringify(opportunitiesError))
    return { success: false, error: opportunitiesError.message }
  }

  // Fetch opportunity_services for all opportunities
  if (opportunities && opportunities.length > 0) {
    const oppIds = opportunities.map(o => o.id)
    const { data: oppServices } = await supabase
      .from('opportunity_services')
      .select('opportunity_id, services(id, name)')
      .in('opportunity_id', oppIds)

    // Create a map of opportunity_id -> services
    const servicesMap: Record<string, Array<{ id: string; name: string }>> = {}
    if (oppServices) {
      for (const os of oppServices) {
        if (!servicesMap[os.opportunity_id]) {
          servicesMap[os.opportunity_id] = []
        }
        if (os.services) {
          servicesMap[os.opportunity_id].push(...(Array.isArray(os.services) ? os.services : [os.services]))
        }
      }
    }

    // Attach services to each opportunity
    for (const opp of opportunities) {
      opp.services = servicesMap[opp.id] || null
    }
  }

  return { success: true, data: { stages, opportunities } }
}

export async function getOpportunityById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, contacts(*), companies(*), services(*), pipeline_stages(*), profiles!opportunities_assigned_to_fkey(full_name), created_by_profile:profiles!opportunities_created_by_fkey(full_name)')
    .eq('id', id)
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getOpportunitiesList() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title')
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}