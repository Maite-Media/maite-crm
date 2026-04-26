'use server'

import { createClient } from '@/lib/supabase/server'

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'stage_change'
  | 'task_created'
  | 'proposal_sent'
  | 'system'

export type Activity = {
  id: string
  type: ActivityType
  description: string
  contact_id: string | null
  opportunity_id: string | null
  company_id: string | null
  created_by: string
  created_at: string
  profiles?: { full_name: string }
}

export async function createActivity(data: {
  type: ActivityType
  description: string
  contact_id?: string
  opportunity_id?: string
  company_id?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({ ...data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: activity }
}

export async function getActivitiesByContact(contactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles(full_name)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getActivitiesByOpportunity(opportunityId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles(full_name)')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getActivitiesByCompany(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles(full_name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getRecentActivities(limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles(full_name), contacts(first_name, last_name), companies(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}