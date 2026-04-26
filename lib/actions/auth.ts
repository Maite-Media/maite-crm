'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerWithInvitation(
  token: string,
  fullName: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Find the invitation by token
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invitationError || !invitation) {
    return { success: false, error: 'Link de invitación inválido' }
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'El link de invitación ha vencido' }
  }

  // Check if already accepted
  if (invitation.accepted_at) {
    return { success: false, error: 'Esta invitación ya fue utilizada' }
  }

  // Check if email already has an account
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', invitation.email)
    .single()

  if (existingUser) {
    return { success: false, error: 'Ya existe un usuario con este email' }
  }

  // Create the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Error al crear usuario' }
  }

  // Create the profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: invitation.email,
      full_name: fullName,
      role: invitation.role,
    })

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getInvitationByToken(token: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return { success: false, error: 'Invitación no encontrada' }
  if (new Date(data.expires_at) < new Date()) return { success: false, error: 'Link vencido' }
  if (data.accepted_at) return { success: false, error: 'Invitación ya utilizada' }

  return { success: true, data }
}