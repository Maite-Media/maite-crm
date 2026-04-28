// ============================================
// WIDGET REGISTRY
// Static definitions of all supported widget types
// ============================================

import { WidgetType, DataSource, Metric, WidgetSize, type WidgetRegistryItem } from './types'

// ============================================
// KPI CARD
// ============================================
const KPI_CARD: WidgetRegistryItem = {
  type: WidgetType.KPI_CARD,
  label: 'KPI Card',
  description: 'Muestra una métrica simple con título, valor y opcionalmente un subtítulo y comparativa',
  allowedDataSources: [
    DataSource.LEADS,
    DataSource.COMPANIES,
    DataSource.OPPORTUNITIES,
    DataSource.TASKS,
    DataSource.PROJECTS,
    DataSource.PROPOSALS,
  ],
  allowedMetrics: [
    Metric.COUNT,
    Metric.SUM,
    Metric.AVERAGE,
    Metric.PIPELINE_VALUE,
  ],
  defaultSize: WidgetSize.SMALL,
  allowedSizes: [WidgetSize.SMALL],
  configurableFields: ['title', 'data_source', 'metric', 'dateRange', 'format', 'icon', 'color'],
  supportsTitleOverride: true,
  supportsConfigJson: true,
  expectedRenderer: 'StatCard',
}

// ============================================
// BAR CHART
// ============================================
const BAR_CHART: WidgetRegistryItem = {
  type: WidgetType.BAR_CHART,
  label: 'Bar Chart',
  description: 'Gráfico de barras para comparar valores entre categorías o mostrar tendencias en el tiempo',
  allowedDataSources: [
    DataSource.LEADS,
    DataSource.COMPANIES,
    DataSource.OPPORTUNITIES,
    DataSource.TASKS,
    DataSource.PROJECTS,
    DataSource.PROPOSALS,
  ],
  allowedMetrics: [
    Metric.COUNT,
    Metric.SUM,
    Metric.AVERAGE,
    Metric.GROUPED_BY_SOURCE,
    Metric.GROUPED_BY_STATUS,
    Metric.GROUPED_BY_MONTH,
  ],
  defaultSize: WidgetSize.MEDIUM,
  allowedSizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
  configurableFields: ['title', 'data_source', 'metric', 'dateRange', 'color', 'orientation'],
  supportsTitleOverride: true,
  supportsConfigJson: true,
  expectedRenderer: 'MiniBarChart',
}

// ============================================
// DONUT CHART
// ============================================
const DONUT_CHART: WidgetRegistryItem = {
  type: WidgetType.DONUT_CHART,
  label: 'Donut Chart',
  description: 'Gráfico de dona para mostrar proporciones y distribución de categorías',
  allowedDataSources: [
    DataSource.LEADS,
    DataSource.COMPANIES,
    DataSource.OPPORTUNITIES,
    DataSource.TASKS,
    DataSource.PROJECTS,
    DataSource.PROPOSALS,
  ],
  allowedMetrics: [
    Metric.COUNT,
    Metric.SUM,
    Metric.GROUPED_BY_SOURCE,
    Metric.GROUPED_BY_STATUS,
  ],
  defaultSize: WidgetSize.MEDIUM,
  allowedSizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
  configurableFields: ['title', 'data_source', 'metric', 'innerRadius', 'showLegend'],
  supportsTitleOverride: true,
  supportsConfigJson: true,
  expectedRenderer: 'DonutSource',
}

// ============================================
// FUNNEL CHART
// ============================================
const FUNNEL_CHART: WidgetRegistryItem = {
  type: WidgetType.FUNNEL_CHART,
  label: 'Funnel Chart',
  description: 'Embudo de conversión de pipeline - muestra etapas con conteo y tasa de conversión',
  allowedDataSources: [
    DataSource.LEADS,
    DataSource.OPPORTUNITIES,
  ],
  allowedMetrics: [
    Metric.COUNT,
    Metric.PIPELINE_VALUE,
    Metric.CONVERSION_FUNNEL,
  ],
  defaultSize: WidgetSize.LARGE,
  allowedSizes: [WidgetSize.LARGE],
  configurableFields: ['title', 'data_source', 'metric', 'showLabels', 'showConversion'],
  supportsTitleOverride: true,
  supportsConfigJson: true,
  expectedRenderer: 'HorizontalFunnel',
}

// ============================================
// LIST WIDGET
// ============================================
const LIST_WIDGET: WidgetRegistryItem = {
  type: WidgetType.LIST_WIDGET,
  label: 'List Widget',
  description: 'Lista de tareas o actividades recientes con enlaces a los registros relacionados',
  allowedDataSources: [
    DataSource.TASKS,
    DataSource.ACTIVITIES,
  ],
  allowedMetrics: [
    Metric.COUNT,
  ],
  defaultSize: WidgetSize.MEDIUM,
  allowedSizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
  configurableFields: ['title', 'data_source', 'metric', 'itemType', 'limit'],
  supportsTitleOverride: true,
  supportsConfigJson: true,
  expectedRenderer: 'RecentTasksList | RecentActivitiesList',
}

// ============================================
// REGISTRY MAP
// ============================================

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryItem> = {
  [WidgetType.KPI_CARD]: KPI_CARD,
  [WidgetType.BAR_CHART]: BAR_CHART,
  [WidgetType.DONUT_CHART]: DONUT_CHART,
  [WidgetType.FUNNEL_CHART]: FUNNEL_CHART,
  [WidgetType.LIST_WIDGET]: LIST_WIDGET,
}

// ============================================
// REGISTRY HELPERS
// ============================================

/**
 * Get the full registry item for a widget type
 */
export function getWidgetDefinition(type: WidgetType): WidgetRegistryItem | null {
  return WIDGET_REGISTRY[type] ?? null
}

/**
 * Check if a type string is a valid WidgetType
 */
export function isValidWidgetType(type: string): type is WidgetType {
  return Object.values(WidgetType).includes(type as WidgetType)
}

/**
 * Check if a data source is allowed for a given widget type
 */
export function isDataSourceAllowed(type: WidgetType, dataSource: DataSource): boolean {
  const def = WIDGET_REGISTRY[type]
  return def?.allowedDataSources.includes(dataSource) ?? false
}

/**
 * Check if a metric is allowed for a given widget type
 */
export function isMetricAllowed(type: WidgetType, metric: Metric): boolean {
  const def = WIDGET_REGISTRY[type]
  return def?.allowedMetrics.includes(metric) ?? false
}

/**
 * Get the default configuration for a widget type
 */
export function getDefaultWidgetConfig(type: WidgetType): Record<string, unknown> {
  const def = WIDGET_REGISTRY[type]
  if (!def) return {}

  const config: Record<string, unknown> = {}

  // Set defaults based on widget type
  if (type === WidgetType.KPI_CARD) {
    config.dateRange = '7d'
    config.format = 'number'
  }

  if (type === WidgetType.LIST_WIDGET) {
    config.itemType = 'tasks'
    config.limit = 8
  }

  if (type === WidgetType.BAR_CHART) {
    config.color = '#E31E24'
  }

  if (type === WidgetType.DONUT_CHART) {
    config.innerRadius = 44
    config.showLegend = true
  }

  if (type === WidgetType.FUNNEL_CHART) {
    config.showLabels = true
    config.showConversion = true
  }

  return config
}

/**
 * Get all widget types as an array
 */
export function getAllWidgetTypes(): WidgetRegistryItem[] {
  return Object.values(WIDGET_REGISTRY)
}

/**
 * Check if a widget type supports a given size
 */
export function isSizeAllowed(type: WidgetType, size: WidgetSize): boolean {
  const def = WIDGET_REGISTRY[type]
  return def?.allowedSizes.includes(size) ?? false
}

/**
 * Get the default size for a widget type
 */
export function getDefaultSize(type: WidgetType): WidgetSize {
  const def = WIDGET_REGISTRY[type]
  return def?.defaultSize ?? WidgetSize.MEDIUM
}