'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Service = {
  id: string
  name: string
  description: string | null
  base_price: number | null
  type: 'one_time' | 'monthly' | 'recurring' | null
  is_active: boolean
  created_at: string
}

export async function createService(data: {
  name: string
  description?: string
  base_price?: number
  type?: 'one_time' | 'monthly' | 'recurring'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  const { data: service, error } = await supabase
    .from('services')
    .insert(data)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true, data: service }
}

export async function updateService(id: string, data: {
  name?: string
  description?: string
  base_price?: number
  type?: 'one_time' | 'monthly' | 'recurring'
  is_active?: boolean
}) {
  const supabase = await createClient()
  const { data: service, error } = await supabase
    .from('services')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true, data: service }
}

export async function deleteService(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function getServices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}