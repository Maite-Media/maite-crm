// ============================================
// WIDGET SYSTEM TYPES
// ============================================

// Widget types supported by the system
export const WidgetType = {
  KPI_CARD: 'KPI_CARD',
  BAR_CHART: 'BAR_CHART',
  DONUT_CHART: 'DONUT_CHART',
  FUNNEL_CHART: 'FUNNEL_CHART',
  LIST_WIDGET: 'LIST_WIDGET',
} as const

export type WidgetType = typeof WidgetType[keyof typeof WidgetType]

// Data sources that widgets can consume
export const DataSource = {
  LEADS: 'leads',
  COMPANIES: 'companies',
  OPPORTUNITIES: 'opportunities',
  TASKS: 'tasks',
  PROJECTS: 'projects',
  PROPOSALS: 'proposals',
  ACTIVITIES: 'activities',
} as const

export type DataSource = typeof DataSource[keyof typeof DataSource]

// Metrics that widgets can display
export const Metric = {
  COUNT: 'count',
  SUM: 'sum',
  AVERAGE: 'average',
  GROUPED_BY_SOURCE: 'grouped_by_source',
  GROUPED_BY_STATUS: 'grouped_by_status',
  GROUPED_BY_MONTH: 'grouped_by_month',
  PIPELINE_VALUE: 'pipeline_value',
  CONVERSION_FUNNEL: 'conversion_funnel',
} as const

export type Metric = typeof Metric[keyof typeof Metric]

// Widget display sizes
export const WidgetSize = {
  SMALL: 'small',   // 1 column (fits in 2/4-col grid)
  MEDIUM: 'medium', // 2 columns
  LARGE: 'large',    // 3 columns or full width
} as const

export type WidgetSize = typeof WidgetSize[keyof typeof WidgetSize]

// Widget config for dashboard_layouts row
export interface WidgetConfig {
  dateRange?: string
  format?: 'number' | 'currency' | 'percentage'
  icon?: string
  color?: string
  itemType?: 'tasks' | 'activities'
  limit?: number
  [key: string]: unknown
}

// Registry item - defines a widget type available in the system
export interface WidgetRegistryItem {
  type: WidgetType
  label: string
  description: string
  allowedDataSources: DataSource[]
  allowedMetrics: Metric[]
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
  configurableFields: string[]
  supportsTitleOverride: boolean
  supportsConfigJson: boolean
  expectedRenderer: string
}

// Dashboard layout item (from DB + joined widget data)
export interface DashboardLayoutItem {
  id: string
  workspace_id: string
  instance_key: string
  widget_id: string
  title_override: string | null
  data_source: DataSource
  metric: Metric
  size: WidgetSize
  position: number
  is_active: boolean
  config_json: WidgetConfig
  widget: {
    id: string
    type: WidgetType
    title: string
    description: string | null
    icon: string | null
    allowed_data_sources: DataSource[]
    allowed_metrics: Metric[]
    config_schema: Record<string, unknown>
    is_active: boolean
  }
}

// Template widget definition (from config_json)
export interface TemplateWidget {
  instance_key: string
  widget_type: WidgetType
  title_override: string
  data_source: DataSource
  metric: Metric
  size: WidgetSize
  position: number
  config_json: WidgetConfig
}

// Template config wrapper
export interface TemplateConfig {
  widgets: TemplateWidget[]
}