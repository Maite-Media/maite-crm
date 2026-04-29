'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'done' | 'overdue'
  assigned_to: string | null
  contact_id: string | null
  opportunity_id: string | null
  company_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export async function getTasksByContact(contactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles!tasks_assigned_to_fkey(full_name), created_by_profile:profiles!tasks_created_by_fkey(full_name)')
    .eq('contact_id', contactId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function createTask(data: {
  title: string
  description?: string
  due_date?: string
  priority?: string
  assigned_to?: string
  contact_id?: string
  opportunity_id?: string
  company_id?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ ...data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true, data: task }
}

export async function updateTask(id: string, data: Partial<Task>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true, data: task }
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Get task title for activity before soft deleting
  const { data: taskData } = await supabase
    .from('tasks')
    .select('title')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // Log deletion activity
  await supabase.from('activities').insert({
    type: 'system',
    description: `Tarea eliminada: ${taskData?.title ?? 'Sin título'}`,
    created_by: user.id
  })

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function completeTask(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true, data: task }
}

export async function getTasksByOpportunity(opportunityId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles!tasks_assigned_to_fkey(full_name), created_by_profile:profiles!tasks_created_by_fkey(full_name)')
    .eq('opportunity_id', opportunityId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getTasks(filters?: {
  status?: string
  assigned_to?: string
  contact_id?: string
  company_id?: string
  opportunity_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select('*, profiles!tasks_assigned_to_fkey(full_name), created_by_profile:profiles!tasks_created_by_fkey(full_name), contacts(first_name, last_name), companies(name), opportunities(title)')
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id)
  if (filters?.company_id) query = query.eq('company_id', filters.company_id)
  if (filters?.opportunity_id) query = query.eq('opportunity_id', filters.opportunity_id)

  const { data, error } = await query
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}