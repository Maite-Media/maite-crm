'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserWorkspace } from './dashboard-workspace'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type PipelineStage = {
  id: string
  workspace_id: string
  stage_key: string | null
  name: string
  description: string | null
  position: number
  probability: number
  color: string | null
  is_active: boolean
  is_won: boolean
  is_lost: boolean
  is_default: boolean
  config_json: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type PipelineTemplateStage = {
  stage_key: string
  name: string
  description: string
  position: number
  probability: number
  color: string
  is_won: boolean
  is_lost: boolean
  is_default: boolean
}

export type PipelineTemplate = {
  id: string
  name: string
  slug: string
  industry: string | null
  description: string | null
  stage_count: number
  is_system: boolean
}

export type AddPipelineStageInput = {
  name: string
  description?: string
  position?: number
  probability?: number
  color?: string
  is_won?: boolean
  is_lost?: boolean
  is_default?: boolean
}

export type UpdatePipelineStageInput = {
  name?: string
  description?: string | null
  probability?: number
  color?: string | null
  is_active?: boolean
  is_won?: boolean
  is_lost?: boolean
  is_default?: boolean
}

export type MigrationStrategy = 'block' | 'move_all_to_default' | 'preserve_won_lost'

export type ApplyTemplateResult =
  | { success: true }
  | { success: false; code: 'OPPORTUNITIES_EXIST'; opportunityCount: number; stagesWithOpportunities: Array<{ stageId: string; stageName: string; opportunityCount: number }>; templateStages: PipelineTemplateStage[] }
  | { success: false; code?: string; error: string }

// ============================================
// HELPERS
// ============================================

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

async function userIsAdminOrOwner(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .maybeSingle()
  return !!member
}

function validateProbability(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100
}

function sanitizeStageKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * List all available pipeline templates.
 * Returns public templates + user's own templates.
 */
export async function listPipelineTemplates(): Promise<{
  success: boolean
  data?: PipelineTemplate[]
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'No autenticado' }
  }

  // Fetch public templates
  const { data: publicTemplates, error: publicError } = await supabase
    .from('pipeline_templates')
    .select('id, name, slug, industry, description, is_system, config_json')
    .eq('is_public', true)
    .order('name', { ascending: true })

  if (publicError) {
    return { success: false, error: publicError.message }
  }

  // Fetch user's own templates
  const { data: userTemplates, error: userError2 } = await supabase
    .from('pipeline_templates')
    .select('id, name, slug, industry, description, is_system, config_json')
    .eq('created_by', user.id)
    .order('name', { ascending: true })

  if (userError2) {
    return { success: false, error: userError2.message }
  }

  // Merge and deduplicate by id
  const templateMap = new Map<string, typeof publicTemplates[0]>()
  publicTemplates?.forEach(t => templateMap.set(t.id, t))
  userTemplates?.forEach(t => templateMap.set(t.id, t))

  const result: PipelineTemplate[] = Array.from(templateMap.values()).map((t) => {
    const config = t.config_json as { stages?: PipelineTemplateStage[] }
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      industry: t.industry,
      description: t.description,
      stage_count: config.stages?.length ?? 0,
      is_system: t.is_system,
    }
  })

  return { success: true, data: result }
}

/**
 * Get a single pipeline template by slug.
 */
export async function getPipelineTemplate(slug: string): Promise<{
  success: boolean
  data?: {
    id: string
    name: string
    slug: string
    industry: string | null
    description: string | null
    is_system: boolean
    stages: PipelineTemplateStage[]
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data: template, error } = await supabase
    .from('pipeline_templates')
    .select('id, name, slug, industry, description, is_system, config_json')
    .eq('slug', slug)
    .single()

  if (error || !template) {
    return { success: false, error: `Template '${slug}' not found` }
  }

  const config = template.config_json as { stages?: PipelineTemplateStage[] }
  return {
    success: true,
    data: {
      id: template.id,
      name: template.name,
      slug: template.slug,
      industry: template.industry,
      description: template.description,
      is_system: template.is_system,
      stages: config.stages ?? [],
    },
  }
}

/**
 * Get pipeline stages for the current user's workspace.
 * Returns stages ordered by position.
 */
export async function getWorkspacePipelineStages(): Promise<{
  success: boolean
  data?: PipelineStage[]
  workspaceId?: string
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  const supabase = await createClient()
  const { data: stages, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('position', { ascending: true })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: stages ?? [], workspaceId: workspace.id }
}

/**
 * Apply a pipeline template to the current user's workspace.
 * Replaces existing stages with template stages.
 * Validates template stages before applying.
 * Only owner/admin can call this.
 *
 * @param templateSlug - The template to apply
 * @param options.migrationStrategy - How to handle existing opportunities:
 *   - undefined/block: Return OPPORTUNITIES_EXIST if opps exist (default)
 *   - 'move_all_to_default': Move all opportunities to the default/first stage
 *   - 'preserve_won_lost': Preserve won/lost stages, move others to default
 */
export async function applyPipelineTemplateToCurrentWorkspace(
  templateSlug: string,
  options?: { migrationStrategy?: MigrationStrategy }
): Promise<ApplyTemplateResult> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, code: 'AUTH_REQUIRED', error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, code: 'PERMISSION_DENIED', error: 'Permission denied' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, code: 'NO_WORKSPACE', error: 'No workspace found' }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('pipeline_templates')
    .select('id, config_json')
    .eq('slug', templateSlug)
    .single()

  if (templateError || !template) {
    return { success: false, code: 'TEMPLATE_NOT_FOUND', error: `Template '${templateSlug}' not found` }
  }

  const config = template.config_json as { stages?: PipelineTemplateStage[] }
  const templateStages = config.stages ?? []

  if (templateStages.length === 0) {
    return { success: true }
  }

  // Validate all stages
  for (const stage of templateStages) {
    if (!stage.name?.trim()) {
      return { success: false, code: 'INVALID_STAGE', error: `Stage at position ${stage.position}: name cannot be empty` }
    }
    if (!validateProbability(stage.probability)) {
      return { success: false, code: 'INVALID_PROBABILITY', error: `Stage '${stage.name}': probability must be 0-100` }
    }
    if (!stage.stage_key?.trim()) {
      return { success: false, code: 'INVALID_STAGE_KEY', error: `Stage at position ${stage.position}: stage_key cannot be empty` }
    }
  }

  // Check for duplicate stage_keys within template
  const stageKeySet = new Set<string>()
  for (const stage of templateStages) {
    if (stageKeySet.has(stage.stage_key)) {
      return { success: false, code: 'DUPLICATE_STAGE_KEY', error: `Duplicate stage_key '${stage.stage_key}' in template` }
    }
    stageKeySet.add(stage.stage_key)
  }

  // Get current stages for this workspace
  const { data: currentStages } = await supabase
    .from('pipeline_stages')
    .select('id, name, is_won, is_lost')
    .eq('workspace_id', workspace.id)

  if (!currentStages || currentStages.length === 0) {
    // No existing stages - just insert new ones
    const stageRows = templateStages.map((s) => ({
      workspace_id: workspace.id,
      stage_key: s.stage_key,
      name: s.name,
      description: s.description || null,
      position: s.position,
      probability: s.probability,
      color: s.color || '#6366f1',
      is_won: s.is_won ?? false,
      is_lost: s.is_lost ?? false,
      is_default: s.is_default ?? false,
      is_active: true,
      config_json: {},
    }))

    const { error: insertError } = await adminClient
      .from('pipeline_stages')
      .insert(stageRows)

    if (insertError) {
      return { success: false, code: 'INSERT_ERROR', error: insertError.message }
    }

    // Update pipeline_settings.active_template_id
    await adminClient
      .from('pipeline_settings')
      .update({ active_template_id: template.id })
      .eq('workspace_id', workspace.id)

    revalidatePath('/settings')
    revalidatePath('/pipeline')
    return { success: true }
  }

  // Check for opportunities in current stages
  const stageIds = currentStages.map(s => s.id)
  const { data: opportunitiesInStages } = await supabase
    .from('opportunities')
    .select('id, stage_id')
    .in('stage_id', stageIds)

  const opportunityCount = opportunitiesInStages?.length ?? 0

  // Group opportunities by stage
  const stageOppMap: Record<string, number> = {}
  const stageNameMap: Record<string, string> = {}
  currentStages.forEach(s => {
    stageOppMap[s.id] = 0
    stageNameMap[s.id] = s.name
  })
  opportunitiesInStages?.forEach(opp => {
    if (stageOppMap[opp.stage_id] !== undefined) {
      stageOppMap[opp.stage_id]++
    }
  })

  const stagesWithOpportunities = currentStages
    .map(s => ({
      stageId: s.id,
      stageName: s.name,
      opportunityCount: stageOppMap[s.id],
    }))
    .filter(s => s.opportunityCount > 0)

  // If there are opportunities and no migration strategy specified, block with info
  if (opportunityCount > 0 && !options?.migrationStrategy) {
    return {
      success: false,
      code: 'OPPORTUNITIES_EXIST',
      opportunityCount,
      stagesWithOpportunities,
      templateStages,
    }
  }

  // Build stage rows from template
  const stageRows = templateStages.map((s) => ({
    workspace_id: workspace.id,
    stage_key: s.stage_key,
    name: s.name,
    description: s.description || null,
    position: s.position,
    probability: s.probability,
    color: s.color || '#6366f1',
    is_won: s.is_won ?? false,
    is_lost: s.is_lost ?? false,
    is_default: s.is_default ?? false,
    is_active: true,
    config_json: {},
  }))

  // Insert new stages first (before deleting old ones)
  const { data: insertedStages, error: insertError } = await adminClient
    .from('pipeline_stages')
    .insert(stageRows)
    .select('id, stage_key, name, is_won, is_lost, is_default')

  if (insertError) {
    return { success: false, code: 'INSERT_ERROR', error: `Error inserting new stages: ${insertError.message}` }
  }

  if (!insertedStages || insertedStages.length === 0) {
    return { success: false, code: 'INSERT_ERROR', error: 'No stages were inserted' }
  }

  // Find target stage for migration
  const strategy = options?.migrationStrategy ?? 'move_all_to_default'

  // Build map from old stage to new stage based on strategy
  let targetStageId: string | null = null

  if (strategy === 'move_all_to_default') {
    // Find the default stage (is_default=true) or first stage
    const defaultStage = insertedStages.find(s => s.is_default) ?? insertedStages[0]
    targetStageId = defaultStage.id
  } else if (strategy === 'preserve_won_lost') {
    // For preserve_won_lost, we keep stage_key mapping
    // won opportunities -> new is_won stage
    // lost opportunities -> new is_lost stage
    // all others -> default/first stage
    targetStageId = (insertedStages.find(s => s.is_default) ?? insertedStages[0]).id
  }

  if (opportunityCount > 0 && targetStageId) {
    // Build old stage metadata for activity logging
    const oldStageMeta = currentStages.reduce((acc, s) => {
      acc[s.id] = s
      return acc
    }, {} as Record<string, { name: string; is_won: boolean; is_lost: boolean }>)

    // Get old stage ids that will be replaced
    const oldStageIds = currentStages.map(s => s.id)

    if (strategy === 'move_all_to_default') {
      // Move all opportunities to target stage
      const { error: moveError } = await adminClient
        .from('opportunities')
        .update({ stage_id: targetStageId })
        .in('stage_id', oldStageIds)

      if (moveError) {
        // Rollback: delete inserted stages
        await adminClient.from('pipeline_stages').delete().eq('workspace_id', workspace.id)
        return { success: false, code: 'MIGRATION_ERROR', error: `Error moving opportunities: ${moveError.message}` }
      }

      // Log activity for moved opportunities
      const movedOpps = opportunitiesInStages?.map(o => o.stage_id)
      if (movedOpps && movedOpps.length > 0 && user) {
        // Get newly moved opportunities to log
        const { data: updatedOpps } = await supabase
          .from('opportunities')
          .select('id')
          .eq('stage_id', targetStageId)
          .in('stage_id', oldStageIds)

        if (updatedOpps && updatedOpps.length > 0) {
          const targetName = insertedStages.find(s => s.id === targetStageId)?.name ?? 'nueva etapa'
          const activityInserts = updatedOpps.map(opp => ({
            type: 'stage_change' as const,
            description: `Pipeline modificado - etapa migrada a "${targetName}" durante aplicación de template`,
            opportunity_id: opp.id,
            created_by: user.id,
          }))
          await adminClient.from('activities').insert(activityInserts)
        }
      }
    } else if (strategy === 'preserve_won_lost') {
      // Map old stage -> new stage based on is_won/is_lost
      const wonNewStage = insertedStages.find(s => s.is_won)
      const lostNewStage = insertedStages.find(s => s.is_lost)
      const defaultNewStage = insertedStages.find(s => s.is_default) ?? insertedStages[0]

      // Group opportunities by their old stage's is_won/is_lost status
      const stageIdToWonLost = currentStages.reduce((acc, s) => {
        acc[s.id] = { is_won: s.is_won, is_lost: s.is_lost }
        return acc
      }, {} as Record<string, { is_won: boolean; is_lost: boolean }>)

      // Create migration mapping
      const migrationMap: Record<string, string> = {}
      oldStageIds.forEach(oldId => {
        const stageMeta = stageIdToWonLost[oldId]
        if (stageMeta.is_won && wonNewStage) {
          migrationMap[oldId] = wonNewStage.id
        } else if (stageMeta.is_lost && lostNewStage) {
          migrationMap[oldId] = lostNewStage.id
        } else {
          migrationMap[oldId] = defaultNewStage.id
        }
      })

      // Move opportunities based on mapping
      for (const [oldId, newId] of Object.entries(migrationMap)) {
        if (oldId === newId) continue // Same stage, no move needed

        const { error: moveError } = await adminClient
          .from('opportunities')
          .update({ stage_id: newId })
          .eq('stage_id', oldId)

        if (moveError) {
          // Rollback
          await adminClient.from('pipeline_stages').delete().eq('workspace_id', workspace.id)
          return { success: false, code: 'MIGRATION_ERROR', error: `Error moving opportunities from "${stageNameMap[oldId]}": ${moveError.message}` }
        }
      }

      // Log activities
      if (user && opportunitiesInStages) {
        const allMovedIds = opportunitiesInStages.map(o => o.id)
        const { data: allUpdatedOpps } = await supabase
          .from('opportunities')
          .select('id, stage_id')
          .in('id', allMovedIds)

        if (allUpdatedOpps && allUpdatedOpps.length > 0) {
          const activityInserts = allUpdatedOpps.map(opp => {
            const newStage = insertedStages.find(s => s.id === opp.stage_id)
            const targetName = newStage?.name ?? 'nueva etapa'
            return {
              type: 'stage_change' as const,
              description: `Pipeline modificado - oportunidad migrada a "${targetName}"`,
              opportunity_id: opp.id,
              created_by: user.id,
            }
          })
          await adminClient.from('activities').insert(activityInserts)
        }
      }
    }
  }

  // Now delete old stages (opportunities are safe in new stages)
  const { error: deleteError } = await adminClient
    .from('pipeline_stages')
    .delete()
    .eq('workspace_id', workspace.id)
    .not('id', 'in', (insertedStages as Array<{id: string}>).map(s => s.id))

  if (deleteError) {
    // Non-fatal - stages were inserted and opportunities migrated, old stages might be partially deleted
    console.error('[applyPipelineTemplateToCurrentWorkspace] warning deleting old stages:', deleteError)
  }

  // Update pipeline_settings.active_template_id
  const { error: settingsError } = await adminClient
    .from('pipeline_settings')
    .update({ active_template_id: template.id })
    .eq('workspace_id', workspace.id)

  if (settingsError) {
    console.error('[applyPipelineTemplateToCurrentWorkspace] settings update error:', settingsError)
  }

  revalidatePath('/settings')
  revalidatePath('/pipeline')
  return { success: true }
}

/**
 * Add a new stage to the current user's workspace.
 * Only owner/admin can call this.
 */
export async function addPipelineStage(data: AddPipelineStageInput): Promise<{
  success: boolean
  data?: PipelineStage
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  // Validate input
  if (!data.name?.trim()) {
    return { success: false, error: 'El nombre de etapa no puede estar vacío' }
  }

  const probability = data.probability ?? 50
  if (!validateProbability(probability)) {
    return { success: false, error: 'La probabilidad debe ser un número entre 0 y 100' }
  }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Generate stage_key from name
  const baseKey = sanitizeStageKey(data.name)
  let stageKey = baseKey
  let counter = 1
  while (true) {
    const { data: existing } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('stage_key', stageKey)
      .maybeSingle()
    if (!existing) break
    stageKey = `${baseKey}_${counter}`
    counter++
  }

  // Get max position
  const { data: maxPos } = await supabase
    .from('pipeline_stages')
    .select('position')
    .eq('workspace_id', workspace.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = maxPos ? maxPos.position + 1 : 0

  // Validate is_won/is_lost constraints
  if (data.is_won) {
    const { data: existingWon } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_won', true)
      .maybeSingle()
    if (existingWon) {
      return { success: false, error: 'Ya existe una etapa marcada como "Ganado" en este workspace' }
    }
  }

  if (data.is_lost) {
    const { data: existingLost } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_lost', true)
      .maybeSingle()
    if (existingLost) {
      return { success: false, error: 'Ya existe una etapa marcada como "Perdido" en este workspace' }
    }
  }

  const { data: newStage, error } = await adminClient
    .from('pipeline_stages')
    .insert({
      workspace_id: workspace.id,
      stage_key: stageKey,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      position: data.position ?? newPosition,
      probability,
      color: data.color || '#6366f1',
      is_won: data.is_won ?? false,
      is_lost: data.is_lost ?? false,
      is_default: data.is_default ?? false,
      is_active: true,
      config_json: {},
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/pipeline')
  return { success: true, data: newStage }
}

/**
 * Update a pipeline stage.
 * Only owner/admin can call this.
 */
export async function updatePipelineStage(stageId: string, data: UpdatePipelineStageInput): Promise<{
  success: boolean
  data?: PipelineStage
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  // Verify stage belongs to this workspace
  const supabase = await createClient()
  const { data: existingStage } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('id', stageId)
    .eq('workspace_id', workspace.id)
    .single()

  if (!existingStage) {
    return { success: false, error: 'Etapa no encontrada' }
  }

  // Validate probability if provided
  if (data.probability !== undefined && !validateProbability(data.probability)) {
    return { success: false, error: 'La probabilidad debe ser un número entre 0 y 100' }
  }

  // Validate is_won constraint - only one per workspace
  if (data.is_won === true) {
    const { data: existingWon } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_won', true)
      .neq('id', stageId)
      .maybeSingle()
    if (existingWon) {
      return { success: false, error: 'Ya existe otra etapa marcada como "Ganado"' }
    }
  }

  // Validate is_lost constraint - only one per workspace
  if (data.is_lost === true) {
    const { data: existingLost } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_lost', true)
      .neq('id', stageId)
      .maybeSingle()
    if (existingLost) {
      return { success: false, error: 'Ya existe otra etapa marcada como "Perdido"' }
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() ?? null
  if (data.probability !== undefined) updateData.probability = data.probability
  if (data.color !== undefined) updateData.color = data.color ?? null
  if (data.is_active !== undefined) updateData.is_active = data.is_active
  if (data.is_won !== undefined) updateData.is_won = data.is_won
  if (data.is_lost !== undefined) updateData.is_lost = data.is_lost
  if (data.is_default !== undefined) updateData.is_default = data.is_default

  if (Object.keys(updateData).length === 0) {
    return { success: true, data: existingStage }
  }

  const adminClient = await createServiceClient()
  const { data: updatedStage, error } = await adminClient
    .from('pipeline_stages')
    .update(updateData)
    .eq('id', stageId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/pipeline')
  return { success: true, data: updatedStage }
}

/**
 * Delete a pipeline stage.
 * If the stage has opportunities and fallbackStageId is provided, moves opportunities first.
 * If fallbackStageId is not provided and stage has opportunities, returns error.
 * Only owner/admin can call this.
 */
export async function deletePipelineStage(stageId: string, fallbackStageId?: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Verify stage belongs to this workspace
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('id, name, is_won, is_lost')
    .eq('id', stageId)
    .eq('workspace_id', workspace.id)
    .single()

  if (!stage) {
    return { success: false, error: 'Etapa no encontrada' }
  }

  // Check if stage has opportunities
  const { count: oppCount } = await supabase
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('stage_id', stageId)

  if (oppCount && oppCount > 0) {
    if (!fallbackStageId) {
      return {
        success: false,
        error: `Esta etapa tiene ${oppCount} oportunidad${oppCount > 1 ? 'es' : ''} asociada${oppCount > 1 ? 's' : ''}. Proporcioná fallbackStageId para mover las oportunidades antes de eliminar, o desactivá la etapa en vez de eliminarla.`
      }
    }

    // Verify fallback stage exists and belongs to same workspace
    const { data: fallbackStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', fallbackStageId)
      .eq('workspace_id', workspace.id)
      .single()

    if (!fallbackStage) {
      return { success: false, error: 'Etapa de destino no encontrada o no pertenece a este workspace' }
    }

    // Move opportunities to fallback stage
    const { error: moveError } = await adminClient
      .from('opportunities')
      .update({ stage_id: fallbackStageId })
      .eq('stage_id', stageId)

    if (moveError) {
      return { success: false, error: `Error moviendo oportunidades: ${moveError.message}` }
    }

    // Log activity for moved opportunities
    const { data: movedOpps } = await supabase
      .from('opportunities')
      .select('id')
      .eq('stage_id', fallbackStageId)

    if (movedOpps && user) {
      const activityInserts = movedOpps.map(opp => ({
        type: 'stage_change' as const,
        description: `Etapa movida de "${stage.name}" durante eliminación de etapa`,
        opportunity_id: opp.id,
        created_by: user.id,
      }))

      await adminClient.from('activities').insert(activityInserts)
    }
  }

  // Also unlink opportunities that were in opps but not via stage_id (legacy compatibility)
  // Actually, opportunities.stage_id is the foreign key, so we already handled it above

  // Delete the stage
  const { error: deleteError } = await adminClient
    .from('pipeline_stages')
    .delete()
    .eq('id', stageId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidatePath('/settings')
  revalidatePath('/pipeline')
  return { success: true }
}

/**
 * Reorder pipeline stages by updating their positions.
 * stageIds must be an ordered array of stage IDs (new order).
 * Only owner/admin can call this.
 */
export async function reorderPipelineStages(stageIds: string[]): Promise<{
  success: boolean
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  if (!Array.isArray(stageIds) || stageIds.length === 0) {
    return { success: false, error: 'stageIds debe ser un array no vacío' }
  }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Verify all stages belong to this workspace
  const { data: existingStages } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspace.id)
    .in('id', stageIds)

  if (!existingStages || existingStages.length !== stageIds.length) {
    return { success: false, error: 'Algunas etapas no pertenecen a este workspace' }
  }

  // Update positions
  for (let i = 0; i < stageIds.length; i++) {
    const { error: updateError } = await adminClient
      .from('pipeline_stages')
      .update({ position: i })
      .eq('id', stageIds[i])

    if (updateError) {
      return { success: false, error: `Error actualizando posición: ${updateError.message}` }
    }
  }

  revalidatePath('/settings')
  revalidatePath('/pipeline')
  return { success: true }
}

/**
 * Get workspace pipeline settings.
 */
export async function getWorkspacePipelineSettings(): Promise<{
  success: boolean
  data?: {
    workspace_id: string
    active_template_id: string | null
  }
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  const supabase = await createClient()
  const { data: settings, error } = await supabase
    .from('pipeline_settings')
    .select('workspace_id, active_template_id')
    .eq('workspace_id', workspace.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: settings ?? { workspace_id: workspace.id, active_template_id: null }
  }
}