'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Company = {
  id: string
  name: string
  industry: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  phone: string | null
  email: string | null
  address: string | null
  size: '1-5' | '6-20' | '21-100' | '100+' | null
  status: 'prospect' | 'active' | 'paused' | 'lost'
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type CompanyWithRelations = Company & {
  profiles?: { full_name: string }
  contacts?: Array<{ id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null }>
  opportunities?: Array<{ id: string; title: string; stage_id: string; estimated_value: number | null }>
}

export async function createCompany(data: {
  name: string
  industry?: string
  website?: string
  instagram?: string
  facebook?: string
  phone?: string
  email?: string
  address?: string
  size?: string
  status?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: company, error } = await supabase
    .from('companies')
    .insert({ ...data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('activities').insert({
    type: 'system',
    description: 'Empresa creada',
    company_id: company.id,
    created_by: user.id
  })

  revalidatePath('/companies')
  revalidatePath('/dashboard')
  return { success: true, data: company }
}

export async function updateCompany(id: string, data: Partial<Company>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: company, error } = await supabase
    .from('companies')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/companies')
  return { success: true, data: company }
}

export async function deleteCompany(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Get company name for activity before soft deleting
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // Log deletion activity
  await supabase.from('activities').insert({
    type: 'system',
    description: `Empresa eliminada: ${company?.name ?? 'Sin nombre'}`,
    company_id: id,
    created_by: user.id
  })

  revalidatePath('/companies')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getCompanies(filters?: {
  status?: string
}) {
  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      *,
      profiles:created_by(full_name),
      contacts(id),
      opportunities(id, stage_id)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }

  let result = companies as CompanyWithRelations[]

  if (filters?.status) {
    result = result.filter(c => c.status === filters.status)
  }

  return { success: true, data: result }
}

export async function getCompanyById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      profiles:created_by(full_name),
      contacts(id, first_name, last_name, email, phone),
      opportunities(id, title, stage_id, estimated_value)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
