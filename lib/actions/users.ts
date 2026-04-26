'use server'

import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'commercial' | 'production' | 'viewer'

export type TeamMember = {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export type Invitation = {
  id: string
  email: string
  role: UserRole
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export async function getTeamMembers(): Promise<{ success: boolean; data?: TeamMember[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Verify current user is admin
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Solo administradores pueden cambiar roles' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function inviteUser(email: string, role: UserRole): Promise<{ success: boolean; data?: { token: string }; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Verify current user is admin
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Solo administradores pueden invitar usuarios' }
  }

  // Check if email already has an account
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingUser) {
    return { success: false, error: 'Ya existe un usuario con este email' }
  }

  // Check for pending invitation
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return { success: false, error: 'Ya existe una invitación pendiente para este email' }
  }

  const { data, error } = await supabase
    .from('invitations')
    .insert({ email: email.toLowerCase(), role, invited_by: user.id })
    .select('token')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { token: data.token } }
}

export async function getInvitations(): Promise<{ success: boolean; data?: Invitation[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export async function cancelInvitation(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Verify current user is admin
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Solo administradores pueden cancelar invitaciones' }
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}