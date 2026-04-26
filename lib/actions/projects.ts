'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Project = {
  id: string
  name: string
  opportunity_id: string | null
  company_id: string | null
  contact_id: string | null
  service_id: string | null
  status: 'pending_onboarding' | 'waiting_materials' | 'in_production' | 'in_review' | 'delivered' | 'completed' | 'in_maintenance'
  start_date: string | null
  estimated_end_date: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ProjectWithRelations = Project & {
  companies: { name: string } | null
  contacts: { first_name: string; last_name: string | null } | null
  services: { name: string } | null
  opportunities: { title: string } | null
  profiles: { full_name: string } | null
  created_by_profile: { full_name: string } | null
}

export async function getProjects() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      companies(name),
      contacts(first_name, last_name),
      services(name),
      opportunities(title),
      profiles!projects_assigned_to_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  console.log('[getProjects] data:', JSON.stringify(data))
  console.log('[getProjects] error:', JSON.stringify(error))

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getProjectById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      companies(*),
      contacts(*),
      services(*),
      opportunities(*),
      profiles!projects_assigned_to_fkey(full_name),
      created_by_profile:profiles!projects_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updateProject(id: string, data: Partial<Project>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true, data: project }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

export async function createProject(data: {
  name: string
  opportunity_id?: string
  company_id?: string
  contact_id?: string
  service_id?: string
  status?: 'pending_onboarding' | 'waiting_materials' | 'in_production' | 'in_review' | 'delivered' | 'completed' | 'in_maintenance'
  start_date?: string
  estimated_end_date?: string
  assigned_to?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true, data: project }
}
