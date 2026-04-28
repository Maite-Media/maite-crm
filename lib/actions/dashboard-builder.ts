'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserWorkspace } from './dashboard-workspace'
import {
  isValidWidgetType,
  isDataSourceAllowed,
  isMetricAllowed,
  isSizeAllowed,
  getWidgetDefinition,
} from '@/lib/widgets/registry'
import { WidgetType, DataSource, Metric, WidgetSize } from '@/lib/widgets/types'

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

export type AddWidgetInput = {
  widget_type: string
  title_override: string
  data_source: string
  metric: string
  size: 'small' | 'medium' | 'large'
}

// ============================================
// PERMISSION CHECKS
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

// ============================================
// SERVER ACTIONS
// ============================================

export async function getDashboardBuilderConfig(): Promise<{
  success: boolean
  data?: DashboardBuilderItem[]
  workspaceId?: string
  error?: string
}> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied: admin role required' }

  const { data: layouts, error: layoutsError } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('position', { ascending: true })

  if (layoutsError) {
    console.error('[getDashboardBuilderConfig] layouts error:', layoutsError)
    return { success: false, error: layoutsError.message }
  }

  const widgetIds = layouts?.map((l) => l.widget_id) ?? []
  const { data: widgets } = await supabase
    .from('dashboard_widgets')
    .select('id, type')
    .in('id', widgetIds)

  const widgetTypeMap: Record<string, string> = {}
  widgets?.forEach((w) => { widgetTypeMap[w.id] = w.type })

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
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied: admin role required' }

  const adminClient = await createServiceClient()

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

export async function resetDashboardToTemplate(
  templateSlug: string = 'maite-media-agency'
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied: admin role required' }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

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
      if (data?.id) widgetTypeToId[widgetType] = data.id
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

  if (deleteError) return { success: false, error: deleteError.message }

  // Insert template rows
  if (layoutRows.length > 0) {
    const { error: insertError } = await adminClient
      .from('dashboard_layouts')
      .insert(layoutRows)

    if (insertError) return { success: false, error: insertError.message }
  }

  // Update active_template_id
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

export async function updateDashboardWidgetInstance(
  layoutId: string,
  data: {
    title_override?: string | null
    data_source?: string
    metric?: string
    size?: 'small' | 'medium' | 'large'
    is_active?: boolean
    config_json?: Record<string, unknown>
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied: admin role required' }

  const supabase = await createClient()
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  // Verify ownership
  const { data: layoutItem, error: fetchError } = await supabase
    .from('dashboard_layouts')
    .select('id, workspace_id, widget_id')
    .eq('id', layoutId)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError.message }
  if (!layoutItem) return { success: false, error: 'Layout item not found' }
  if (layoutItem.workspace_id !== workspace.id) return { success: false, error: 'Permission denied' }

  // Get widget type for validation
  const { data: widgetData } = await supabase
    .from('dashboard_widgets')
    .select('type')
    .eq('id', layoutItem.widget_id)
    .single()

  const widgetType = widgetData?.type as WidgetType | undefined

  if (widgetType && isValidWidgetType(widgetType)) {
    if (data.data_source && !isDataSourceAllowed(widgetType, data.data_source as DataSource)) {
      return { success: false, error: `Data source '${data.data_source}' no permitido para widget '${widgetType}'` }
    }
    if (data.metric && !isMetricAllowed(widgetType, data.metric as Metric)) {
      return { success: false, error: `Métrica '${data.metric}' no permitida para widget '${widgetType}'` }
    }
    if (data.size && !isSizeAllowed(widgetType, data.size as WidgetSize)) {
      return { success: false, error: `Tamaño '${data.size}' no permitido para widget '${widgetType}'` }
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = {}
  if (data.title_override !== undefined) updateData.title_override = data.title_override
  if (data.data_source !== undefined) updateData.data_source = data.data_source
  if (data.metric !== undefined) updateData.metric = data.metric
  if (data.size !== undefined) updateData.size = data.size
  if (data.is_active !== undefined) updateData.is_active = data.is_active
  if (data.config_json !== undefined) updateData.config_json = data.config_json

  const adminClient = await createServiceClient()
  const { error: updateError } = await adminClient
    .from('dashboard_layouts')
    .update(updateData)
    .eq('id', layoutId)

  if (updateError) return { success: false, error: updateError.message }

  return { success: true }
}

export async function deleteDashboardLayoutItem(
  layoutId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied: admin role required' }

  const supabase = await createClient()
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  const { data: layoutItem, error: fetchError } = await supabase
    .from('dashboard_layouts')
    .select('id, workspace_id')
    .eq('id', layoutId)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError.message }
  if (!layoutItem) return { success: false, error: 'Layout item not found' }
  if (layoutItem.workspace_id !== workspace.id) return { success: false, error: 'Permission denied' }

  const adminClient = await createServiceClient()
  const { error: deleteError } = await adminClient
    .from('dashboard_layouts')
    .delete()
    .eq('id', layoutId)

  if (deleteError) return { success: false, error: deleteError.message }

  return { success: true }
}

export async function addDashboardWidgetInstance(
  data: AddWidgetInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const isAdmin = await userIsAdminOrOwner(user.id)
  if (!isAdmin) return { success: false, error: 'Permission denied: admin role required' }

  const supabase = await createClient()
  const adminClient = await createServiceClient()

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) return { success: false, error: 'No workspace found' }

  const { widget_type, title_override, data_source, metric, size } = data

  if (!isValidWidgetType(widget_type)) {
    return { success: false, error: `Widget type '${widget_type}' no existe en el registro` }
  }

  const wt = widget_type as WidgetType

  if (!isDataSourceAllowed(wt, data_source as DataSource)) {
    return { success: false, error: `Data source '${data_source}' no permitido para widget '${widget_type}'` }
  }
  if (!isMetricAllowed(wt, metric as Metric)) {
    return { success: false, error: `Métrica '${metric}' no permitida para widget '${widget_type}'` }
  }
  if (!isSizeAllowed(wt, size as WidgetSize)) {
    return { success: false, error: `Tamaño '${size}' no permitido para widget '${widget_type}'` }
  }

  // Get widget_id from catalog
  const { data: widgetData, error: widgetError } = await supabase
    .from('dashboard_widgets')
    .select('id')
    .eq('type', widget_type)
    .single()

  if (widgetError || !widgetData) {
    return { success: false, error: `Widget type '${widget_type}' not found in catalog` }
  }

  // Get max position
  const { data: existingLayouts } = await supabase
    .from('dashboard_layouts')
    .select('position')
    .eq('workspace_id', workspace.id)
    .order('position', { ascending: false })
    .limit(1)

  const maxPosition = existingLayouts && existingLayouts.length > 0 ? existingLayouts[0].position : -1
  const newPosition = maxPosition + 1

  const instance_key = `custom_${widget_type.toLowerCase()}_${Date.now()}`

  const { error: insertError } = await adminClient
    .from('dashboard_layouts')
    .insert({
      workspace_id: workspace.id,
      instance_key,
      widget_id: widgetData.id,
      title_override,
      data_source,
      metric,
      size,
      position: newPosition,
      is_active: true,
      config_json: {},
    })

  if (insertError) return { success: false, error: insertError.message }

  return { success: true }
}