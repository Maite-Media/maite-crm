'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Contact = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  company_id: string | null
  position: string | null
  source: 'web' | 'whatsapp' | 'linkedin' | 'referral' | 'ad' | 'call' | 'other' | null
  interest_level: 'cold' | 'warm' | 'hot' | null
  estimated_budget: number | null
  notes: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type ContactWithRelations = Contact & {
  companies: { name: string } | null
  profiles: { full_name: string } | null
}

export async function createContact(data: {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  whatsapp?: string
  company_id?: string
  position?: string
  source?: string
  interest_level?: string
  estimated_budget?: number
  notes?: string
  assigned_to?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const insertData = { ...data, created_by: user.id }

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert(insertData)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  const { error: activityError } = await supabase.from('activities').insert({
    type: 'system',
    description: 'Lead creado',
    contact_id: contact.id,
    created_by: user.id
  })
  if (activityError) {
    console.error('[Activity log failed]', activityError)
  }

  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return { success: true, data: contact }
}

export async function updateContact(id: string, data: Partial<Contact>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: contact, error } = await supabase
    .from('contacts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/leads')
  return { success: true, data: contact }
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Get contact info for activity before soft deleting
  const { data: contact } = await supabase
    .from('contacts')
    .select('first_name, last_name')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // Log deletion activity
  const contactName = contact ? `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}` : 'Lead'
  const { error: activityError } = await supabase.from('activities').insert({
    type: 'system',
    description: `Lead eliminado: ${contactName}`,
    contact_id: id,
    created_by: user.id
  })
  if (activityError) {
    console.error('[Activity log failed]', activityError)
  }

  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getContacts(filters?: {
  interest_level?: string
  source?: string
  assigned_to?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('contacts')
    .select('*, companies(name), profiles!contacts_assigned_to_fkey(full_name), created_by_profile:profiles!contacts_created_by_fkey(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters?.interest_level) query = query.eq('interest_level', filters.interest_level)
  if (filters?.source) query = query.eq('source', filters.source)
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)

  const { data, error } = await query
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getContactById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*, companies(*), profiles!contacts_assigned_to_fkey(full_name), created_by_profile:profiles!contacts_created_by_fkey(full_name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}