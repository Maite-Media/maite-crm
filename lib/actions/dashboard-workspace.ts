'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string | null
  industry: string | null
  plan: string
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
}

export type DashboardWidget = {
  id: string
  type: 'KPI_CARD' | 'BAR_CHART' | 'DONUT_CHART' | 'FUNNEL_CHART' | 'LIST_WIDGET'
  title: string
  description: string | null
  icon: string | null
  allowed_data_sources: string[]
  allowed_metrics: string[]
  config_schema: Record<string, unknown>
  is_active: boolean
}

export type DashboardLayoutItem = {
  id: string
  workspace_id: string
  instance_key: string
  widget_id: string
  title_override: string | null
  data_source: string
  metric: string
  size: 'small' | 'medium' | 'large'
  position: number
  is_active: boolean
  config_json: Record<string, unknown>
  // joined widget data
  widget: DashboardWidget
}

// ============================================
// HELPERS
// ============================================

/**
 * Map widget_type string to UUID from dashboard_widgets catalog
 */
async function resolveWidgetId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  widgetType: string
): Promise<string | null> {
  const { data } = await supabase
    .from('dashboard_widgets')
    .select('id')
    .eq('type', widgetType)
    .single()
  return data?.id ?? null
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get the workspace for a given user.
 * Returns null if no workspace found.
 */
export async function getUserWorkspace(userId: string): Promise<Workspace | null> {
  const supabase = await createClient()

  // Find workspace via workspace_members
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError || !member) {
    return null
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', member.workspace_id)
    .single()

  if (workspaceError || !workspace) {
    return null
  }

  return workspace as Workspace
}

/**
 * Ensure user has a workspace.
 * If not, creates:
 * 1. workspace (slug: maite-media-{shortUserId})
 * 2. workspace_members (role: owner)
 * 3. dashboard_settings
 * 4. applies template maite-media-agency
 */
export async function ensureUserWorkspace(userId: string): Promise<{
  success: boolean
  workspace?: Workspace
  error?: string
}> {
  // Use anon client for reading (RLS will filter)
  const supabase = await createClient()
  // Use service client for writing (bypasses RLS for bootstrap)
  const adminClient = await createServiceClient()

  // Check if user already has a workspace
  const existingWorkspace = await getUserWorkspace(userId)
  if (existingWorkspace) {
    return { success: true, workspace: existingWorkspace }
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  const workspaceName = profile?.full_name
    ? `${profile.full_name}'s Workspace`
    : 'My Workspace'

  const shortId = userId.replace(/-/g, '').slice(0, 8)
  const workspaceSlug = `maite-media-${shortId}`

  // Create workspace with service role to bypass RLS
  const { data: newWorkspace, error: wsError } = await adminClient
    .from('workspaces')
    .insert({
      name: workspaceName,
      slug: workspaceSlug,
      owner_id: userId,
      industry: 'digital_marketing',
      plan: 'starter',
    })
    .select()
    .single()

  if (wsError || !newWorkspace) {
    console.error('[ensureUserWorkspace] workspace insert error:', wsError)
    return { success: false, error: wsError?.message ?? 'Error creating workspace' }
  }

  // Create workspace_members entry (user is owner) with service role
  const { error: memberError } = await adminClient
    .from('workspace_members')
    .insert({
      workspace_id: newWorkspace.id,
      user_id: userId,
      role: 'owner',
    })

  if (memberError) {
    console.error('[ensureUserWorkspace] member insert error:', memberError)
    return { success: false, error: memberError.message }
  }

  // Create dashboard_settings with service role
  const { error: settingsError } = await adminClient
    .from('dashboard_settings')
    .insert({
      workspace_id: newWorkspace.id,
      active_template_id: null,
    })

  if (settingsError) {
    console.error('[ensureUserWorkspace] settings insert error:', settingsError)
    // Non-fatal, continue
  }

  // Apply default template
  const applyResult = await applyTemplateToWorkspace(newWorkspace.id, 'maite-media-agency')
  if (!applyResult.success) {
    console.error('[ensureUserWorkspace] template apply error:', applyResult.error)
    // Continue anyway - workspace is created
  }

  return { success: true, workspace: newWorkspace as Workspace }
}

/**
 * Apply a template's widgets to a workspace's dashboard_layouts.
 * Uses instance_key for upsert (insert or update if exists).
 */
export async function applyTemplateToWorkspace(
  workspaceId: string,
  templateSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Fetch template (public read - anon client fine)
  const { data: template, error: templateError } = await supabase
    .from('dashboard_templates')
    .select('config_json')
    .eq('slug', templateSlug)
    .single()

  if (templateError || !template) {
    console.error('[applyTemplateToWorkspace] template not found:', templateError)
    return { success: false, error: `Template '${templateSlug}' not found` }
  }

  const config = template.config_json as { widgets?: TemplateWidget[] }
  const widgets = config.widgets ?? []

  if (widgets.length === 0) {
    return { success: true }
  }

  // Resolve all widget_type -> widget_id (UUID) in batch
  const widgetTypeToId: Record<string, string> = {}
  for (const widget of widgets) {
    const widgetType = (widget as Record<string, unknown>).widget_type as string
    if (widgetType && !widgetTypeToId[widgetType]) {
      const resolvedId = await resolveWidgetId(supabase, widgetType)
      if (resolvedId) {
        widgetTypeToId[widgetType] = resolvedId
      }
    }
  }

  // Build layout rows for upsert
  const layoutRows = widgets
    .map((w) => {
      const wt = (w as Record<string, unknown>)
      const widgetType = wt.widget_type as string
      const widgetId = widgetTypeToId[widgetType]

      if (!widgetId) {
        console.warn(`[applyTemplateToWorkspace] skipping widget: unknown type '${widgetType}'`)
        return null
      }

      return {
        workspace_id: workspaceId,
        instance_key: wt.instance_key as string,
        widget_id: widgetId,
        title_override: (wt.title_override as string) ?? null,
        data_source: wt.data_source as string,
        metric: wt.metric as string,
        size: (wt.size as string) ?? 'medium',
        position: (wt.position as number) ?? 0,
        is_active: true,
        config_json: (wt.config_json as Record<string, unknown>) ?? {},
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (layoutRows.length === 0) {
    return { success: true }
  }

  // Upsert: delete existing + insert new with service role
  const { error: deleteError } = await adminClient
    .from('dashboard_layouts')
    .delete()
    .eq('workspace_id', workspaceId)

  if (deleteError) {
    console.error('[applyTemplateToWorkspace] delete existing error:', deleteError)
    return { success: false, error: deleteError.message }
  }

  const { error: insertError } = await adminClient
    .from('dashboard_layouts')
    .insert(layoutRows)

  if (insertError) {
    console.error('[applyTemplateToWorkspace] insert error:', insertError)
    return { success: false, error: insertError.message }
  }

  // Update dashboard_settings with active_template_id
  const { data: templateData } = await supabase
    .from('dashboard_templates')
    .select('id')
    .eq('slug', templateSlug)
    .single()

  if (templateData) {
    await supabase
      .from('dashboard_settings')
      .update({ active_template_id: templateData.id })
      .eq('workspace_id', workspaceId)
  }

  return { success: true }
}

/**
 * Get dashboard layout for a user.
 * If no workspace/layout exists, auto-initializes workspace + template.
 * Returns ordered list of widget instances ready for rendering.
 */
export async function getUserDashboardLayout(userId: string): Promise<{
  success: boolean
  data?: DashboardLayoutItem[]
  workspaceId?: string
  error?: string
}> {
  const supabase = await createClient()

  // Ensure workspace exists (auto-initialization)
  const wsResult = await ensureUserWorkspace(userId)
  if (!wsResult.success || !wsResult.workspace) {
    return { success: false, error: wsResult.error ?? 'Failed to initialize workspace' }
  }

  const workspaceId = wsResult.workspace.id

  // Fetch layout + widget data
  const { data: layouts, error: layoutsError } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (layoutsError) {
    console.error('[getUserDashboardLayout] layouts error:', layoutsError)
    return { success: false, error: layoutsError.message }
  }

  if (!layouts || layouts.length === 0) {
    // Should not happen if ensureUserWorkspace worked, but safety fallback
    return { success: true, data: [], workspaceId }
  }

  // Fetch widget catalog for all widget_ids
  const widgetIds = layouts.map((l) => l.widget_id)
  const { data: widgets, error: widgetsError } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .in('id', widgetIds)

  if (widgetsError) {
    console.error('[getUserDashboardLayout] widgets error:', widgetsError)
    return { success: false, error: widgetsError.message }
  }

  const widgetMap: Record<string, DashboardWidget> = {}
  widgets?.forEach((w) => {
    widgetMap[w.id] = w as DashboardWidget
  })

  // Merge layout + widget data
  const result: DashboardLayoutItem[] = layouts
    .map((layout) => {
      const widget = widgetMap[layout.widget_id]
      if (!widget) return null
      return {
        id: layout.id,
        workspace_id: layout.workspace_id,
        instance_key: layout.instance_key,
        widget_id: layout.widget_id,
        title_override: layout.title_override,
        data_source: layout.data_source,
        metric: layout.metric,
        size: layout.size as 'small' | 'medium' | 'large',
        position: layout.position,
        is_active: layout.is_active,
        config_json: (layout.config_json ?? {}) as Record<string, unknown>,
        widget,
      }
    })
    .filter((item): item is DashboardLayoutItem => item !== null)

  return { success: true, data: result, workspaceId }
}

// ============================================
// TEMPLATE TYPE (internal)
// ============================================

type TemplateWidget = {
  instance_key: string
  widget_type: string
  title_override: string
  data_source: string
  metric: string
  size: string
  position: number
  config_json: Record<string, unknown>
}