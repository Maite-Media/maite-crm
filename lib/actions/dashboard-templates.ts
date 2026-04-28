'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserWorkspace } from './dashboard-workspace'
import { isValidWidgetType, isDataSourceAllowed, isMetricAllowed, isSizeAllowed } from '@/lib/widgets/registry'
import { WidgetType, WidgetSize } from '@/lib/widgets/types'

// ============================================
// TYPES
// ============================================

export type TemplateWidget = {
  instance_key: string
  widget_type: string
  title_override: string
  data_source: string
  metric: string
  size: string
  position: number
  config_json: Record<string, unknown>
}

export type TemplateInfo = {
  id: string
  name: string
  slug: string
  description: string | null
  industry: string | null
  widget_count: number
  is_active: boolean
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
 * List all available dashboard templates.
 * Returns public templates + user's workspace templates.
 */
export async function listDashboardTemplates(): Promise<{
  success: boolean
  data?: TemplateInfo[]
  error?: string
}> {
  const supabase = await createClient()

  // Get authenticated user first
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'No autenticado' }
  }

  // Fetch public templates
  const { data: publicTemplates, error: publicError } = await supabase
    .from('dashboard_templates')
    .select('id, name, slug, description, industry, config_json')
    .eq('is_public', true)
    .order('name', { ascending: true })

  if (publicError) {
    console.error('[listDashboardTemplates] public templates error:', publicError)
    return { success: false, error: publicError.message }
  }

  // Fetch user's own templates
  const { data: userTemplates, error: userError2 } = await supabase
    .from('dashboard_templates')
    .select('id, name, slug, description, industry, config_json')
    .eq('created_by', user.id)
    .order('name', { ascending: true })

  if (userError2) {
    console.error('[listDashboardTemplates] user templates error:', userError2)
    return { success: false, error: userError2.message }
  }

  // Merge and deduplicate by id
  const templateMap = new Map<string, typeof publicTemplates[0]>()
  publicTemplates?.forEach(t => templateMap.set(t.id, t))
  userTemplates?.forEach(t => templateMap.set(t.id, t))

  const result: TemplateInfo[] = Array.from(templateMap.values()).map((t) => {
    const config = t.config_json as { widgets?: Array<Record<string, unknown>> }
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      industry: t.industry,
      widget_count: config.widgets?.length ?? 0,
      is_active: true, // is_active comes from dashboard_settings.active_template_id, not from template
    }
  })

  return { success: true, data: result }
}

/**
 * Get a single dashboard template by slug.
 */
export async function getDashboardTemplate(slug: string): Promise<{
  success: boolean
  data?: {
    id: string
    name: string
    slug: string
    description: string | null
    industry: string | null
    config_json: { widgets?: TemplateWidget[] }
    widget_count: number
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data: template, error } = await supabase
    .from('dashboard_templates')
    .select('id, name, slug, description, industry, config_json')
    .eq('slug', slug)
    .single()

  if (error || !template) {
    return { success: false, error: `Template '${slug}' not found` }
  }

  const config = template.config_json as { widgets?: TemplateWidget[] }
  return {
    success: true,
    data: {
      id: template.id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      industry: template.industry,
      config_json: config,
      widget_count: config.widgets?.length ?? 0,
    },
  }
}

/**
 * Validate a list of template widgets against the WidgetRegistry.
 * Returns the first validation error found, or null if all valid.
 */
function validateTemplateWidgets(
  widgets: TemplateWidget[]
): { instance_key: string; reason: string } | null {
  for (const widget of widgets) {
    const { instance_key, widget_type, data_source, metric, size, position } = widget

    // instance_key must be non-empty
    if (!instance_key || instance_key.trim() === '') {
      return { instance_key, reason: 'instance_key vacío o inválido' }
    }

    // position must be a valid number
    if (typeof position !== 'number' || Number.isNaN(position)) {
      return { instance_key, reason: `position debe ser un número válido, recibido: ${position}` }
    }

    // widget_type must exist in registry
    if (!isValidWidgetType(widget_type)) {
      return { instance_key, reason: `widget_type '${widget_type}' no existe en el registro` }
    }

    // data_source must be allowed for that widget_type
    if (!isDataSourceAllowed(widget_type as WidgetType, data_source as never)) {
      return {
        instance_key,
        reason: `data_source '${data_source}' no está permitido para widget_type '${widget_type}'`,
      }
    }

    // metric must be allowed for that widget_type
    if (!isMetricAllowed(widget_type as WidgetType, metric as never)) {
      return {
        instance_key,
        reason: `metric '${metric}' no está permitida para widget_type '${widget_type}'`,
      }
    }

    // size must be valid
    if (!isSizeAllowed(widget_type as WidgetType, size as WidgetSize)) {
      return {
        instance_key,
        reason: `size '${size}' no está permitido para widget_type '${widget_type}'`,
      }
    }
  }

  return null
}

/**
 * Apply a dashboard template to the current user's workspace.
 * Validates all widgets before applying.
 * Only owner/admin can call this.
 */
export async function applyDashboardTemplateToCurrentWorkspace(slug: string): Promise<{
  success: boolean
  error?: string
}> {
  // Get authenticated user from server
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Verify owner/admin role
  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) {
    return { success: false, error: 'Permission denied' }
  }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  // Get workspace
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) {
    return { success: false, error: 'No workspace found' }
  }

  // Fetch template by slug
  const { data: template, error: templateError } = await supabase
    .from('dashboard_templates')
    .select('id, config_json')
    .eq('slug', slug)
    .single()

  if (templateError || !template) {
    return { success: false, error: `Template '${slug}' not found` }
  }

  const config = template.config_json as { widgets?: TemplateWidget[] }
  const widgets = config.widgets ?? []

  // Validate ALL widgets before applying
  if (widgets.length > 0) {
    const validationError = validateTemplateWidgets(widgets)
    if (validationError) {
      return {
        success: false,
        error: `Template inválido: widget '${validationError.instance_key}' tiene problema: ${validationError.reason}`,
      }
    }
  }

  if (widgets.length === 0) {
    return { success: true }
  }

  // Resolve widget_type -> widget_id (UUID)
  const widgetTypeToId: Record<string, string> = {}
  for (const widget of widgets) {
    const widgetType = widget.widget_type
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
      const widgetType = w.widget_type
      const widgetId = widgetTypeToId[widgetType]
      if (!widgetId) return null

      return {
        workspace_id: workspace.id,
        instance_key: w.instance_key,
        widget_id: widgetId,
        title_override: w.title_override || null,
        data_source: w.data_source,
        metric: w.metric,
        size: w.size || 'medium',
        position: w.position ?? 0,
        is_active: true,
        config_json: w.config_json ?? {},
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  // Delete existing dashboard_layouts for this workspace
  const { error: deleteError } = await adminClient
    .from('dashboard_layouts')
    .delete()
    .eq('workspace_id', workspace.id)

  if (deleteError) {
    console.error('[applyDashboardTemplateToCurrentWorkspace] delete error:', deleteError)
    return { success: false, error: deleteError.message }
  }

  // Insert new layout rows from template
  if (layoutRows.length > 0) {
    const { error: insertError } = await adminClient
      .from('dashboard_layouts')
      .insert(layoutRows)

    if (insertError) {
      console.error('[applyDashboardTemplateToCurrentWorkspace] insert error:', insertError)
      return { success: false, error: insertError.message }
    }
  }

  // Update dashboard_settings.active_template_id
  const { error: updateError } = await adminClient
    .from('dashboard_settings')
    .update({ active_template_id: template.id })
    .eq('workspace_id', workspace.id)

  if (updateError) {
    console.error('[applyDashboardTemplateToCurrentWorkspace] update settings error:', updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true }
}
