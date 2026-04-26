'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PipelineStage = {
  id: string
  name: string
  position: number
  color: string
  is_won: boolean
  is_lost: boolean
  created_at: string
}

export async function getPipelineStages() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('position', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updatePipelineStage(id: string, data: {
  name?: string
  color?: string
  position?: number
}) {
  const supabase = await createClient()
  const { data: stage, error } = await supabase
    .from('pipeline_stages')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true, data: stage }
}

export async function reorderPipelineStages(stages: { id: string, position: number }[]) {
  const supabase = await createClient()
  for (const stage of stages) {
    await supabase.from('pipeline_stages').update({ position: stage.position }).eq('id', stage.id)
  }
  revalidatePath('/settings')
  return { success: true }
}