'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserWorkspace } from './dashboard-workspace'

// ============================================
// TYPES
// ============================================

export type DashboardBuilderItem = {
  id: string
  instance_key: string
  widget_type: string
  title_override: string | null
  data_source: string
  metric: string
  size: 'small' | 'medium' | 'large'
  position: number
  is_active: boolean
  config_json: Record<string, unknown>
}

// ============================================
// PERMISSION CHECKS
// ============================================

/**
 * Get authenticated user from server Supabase client.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Check if user has admin/owner role in their workspace.
 */
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

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get dashboard layout items for the Dashboard Builder.
 * Returns all widgets (active + inactive) ordered by position.
 * User is obtained from server session - no client-side userId needed.
 */
export async function getDashboardBuilderConfig(): Promise<{
  success: boolean
  data?: DashboardBuilderItem[]
  workspaceId?: string
  error?: string
}> {
  // Get authenticated user directly from server
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const supabase = await createClient()

  // Get workspace
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) {
    return { success: false, error: 'No workspace found' }
  }

  // Check permission
  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) {
    return { success: false, error: 'Permission denied: admin role required' }
  }

  // Fetch all layout items (active + inactive)
  const { data: layouts, error: layoutsError } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('position', { ascending: true })

  if (layoutsError) {
    console.error('[getDashboardBuilderConfig] layouts error:', layoutsError)
    return { success: false, error: layoutsError.message }
  }

  // Fetch widget catalog for widget_type
  const widgetIds = layouts?.map((l) => l.widget_id) ?? []
  const { data: widgets } = await supabase
    .from('dashboard_widgets')
    .select('id, type')
    .in('id', widgetIds)

  const widgetTypeMap: Record<string, string> = {}
  widgets?.forEach((w) => {
    widgetTypeMap[w.id] = w.type
  })

  const result: DashboardBuilderItem[] = (layouts ?? []).map((layout) => ({
    id: layout.id,
    instance_key: layout.instance_key,
    widget_type: widgetTypeMap[layout.widget_id] ?? 'UNKNOWN',
    title_override: layout.title_override,
    data_source: layout.data_source,
    metric: layout.metric,
    size: layout.size as 'small' | 'medium' | 'large',
    position: layout.position,
    is_active: layout.is_active,
    config_json: (layout.config_json ?? {}) as Record<string, unknown>,
  }))

  return { success: true, data: result, workspaceId: workspace.id }
}

/**
 * Update dashboard layout items.
 * Only owner/admin can call this.
 * Updates: title_override, size, position, is_active, config_json.
 * Does NOT change: instance_key, widget_id, data_source, metric.
 * User is obtained from server session - no client-side userId needed.
 */
export async function updateDashboardLayout(
  updates: Array<{
    id: string
    title_override: string | null
    size: 'small' | 'medium' | 'large'
    position: number
    is_active: boolean
    config_json?: Record<string, unknown>
  }>
): Promise<{ success: boolean; error?: string }> {
  // Get authenticated user directly from server
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Check permission
  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) {
    return { success: false, error: 'Permission denied: admin role required' }
  }

  const adminClient = await createServiceClient()

  // Apply all updates via service role
  for (const update of updates) {
    const { error } = await adminClient
      .from('dashboard_layouts')
      .update({
        title_override: update.title_override,
        size: update.size,
        position: update.position,
        is_active: update.is_active,
        config_json: update.config_json ?? {},
      })
      .eq('id', update.id)

    if (error) {
      console.error('[updateDashboardLayout] update error for id:', update.id, error)
      return { success: false, error: `Failed to update widget: ${error.message}` }
    }
  }

  return { success: true }
}

/**
 * Reset dashboard to a template.
 * Only owner/admin can call this.
 * Uses applyTemplateToWorkspace internally (delete + insert pattern).
 * User is obtained from server session - no client-side userId needed.
 */
export async function resetDashboardToTemplate(
  templateSlug: string = 'maite-media-agency'
): Promise<{ success: boolean; error?: string }> {
  // Get authenticated user directly from server
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Check permission
  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) {
    return { success: false, error: 'Permission denied: admin role required' }
  }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Get workspace
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) {
    return { success: false, error: 'No workspace found' }
  }

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('dashboard_templates')
    .select('config_json')
    .eq('slug', templateSlug)
    .single()

  if (templateError || !template) {
    return { success: false, error: `Template '${templateSlug}' not found` }
  }

  const config = template.config_json as { widgets?: Array<Record<string, unknown>> }
  const widgets = config.widgets ?? []

  if (widgets.length === 0) {
    return { success: true }
  }

  // Resolve widget_type -> widget_id
  const widgetTypeToId: Record<string, string> = {}
  for (const widget of widgets) {
    const widgetType = widget.widget_type as string
    if (widgetType && !widgetTypeToId[widgetType]) {
      const { data } = await supabase
        .from('dashboard_widgets')
        .select('id')
        .eq('type', widgetType)
        .single()
      if (data?.id) {
        widgetTypeToId[widgetType] = data.id
      }
    }
  }

  // Build layout rows
  const layoutRows = widgets
    .map((w) => {
      const widgetType = w.widget_type as string
      const widgetId = widgetTypeToId[widgetType]
      if (!widgetId) return null

      return {
        workspace_id: workspace.id,
        instance_key: w.instance_key as string,
        widget_id: widgetId,
        title_override: (w.title_override as string) ?? null,
        data_source: w.data_source as string,
        metric: w.metric as string,
        size: (w.size as string) ?? 'medium',
        position: (w.position as number) ?? 0,
        is_active: true,
        config_json: (w.config_json as Record<string, unknown>) ?? {},
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  // Delete existing layouts
  const { error: deleteError } = await adminClient
    .from('dashboard_layouts')
    .delete()
    .eq('workspace_id', workspace.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Insert template rows
  if (layoutRows.length > 0) {
    const { error: insertError } = await adminClient
      .from('dashboard_layouts')
      .insert(layoutRows)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  // Update active_template_id in dashboard_settings
  const { data: templateData } = await supabase
    .from('dashboard_templates')
    .select('id')
    .eq('slug', templateSlug)
    .single()

  if (templateData) {
    await supabase
      .from('dashboard_settings')
      .update({ active_template_id: templateData.id })
      .eq('workspace_id', workspace.id)
  }

  return { success: true }
}