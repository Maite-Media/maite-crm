import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserDashboardLayout } from '@/lib/actions/dashboard-workspace'
import { WidgetRenderer } from './widget-renderer'
import { CardContainer, SectionLabel, SectionSubtitle } from './dashboard-ui'
import { LoadingCard, LoadingChart } from './dashboard-ui'

// Size to grid column span mapping
// Grid is 4 columns on lg, 2 columns on mobile (1 on small screens)
function sizeToSpan(size: string): string {
  switch (size) {
    case 'small':
      return 'col-span-1'
    case 'medium':
      return 'col-span-2'
    case 'large':
      return 'col-span-4 lg:col-span-3'
    default:
      return 'col-span-1'
  }
}

function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <LoadingCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2"><LoadingChart /></div>
        <LoadingChart />
        <div className="lg:col-span-3"><LoadingChart /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LoadingChart />
        <LoadingChart />
      </div>
    </div>
  )
}

async function DashboardGrid({ userId }: { userId: string }) {
  const result = await getUserDashboardLayout(userId)

  if (!result.success || !result.data || result.data.length === 0) {
    return <DashboardLoading />
  }

  const widgets = result.data

  // Separate widgets by type for appropriate rendering
  // KPI_CARD widgets go in top row, others render individually
  const kpiWidgets = widgets.filter(w => w.widget.type === 'KPI_CARD' && w.is_active)
  const barChartWidget = widgets.find(w => w.instance_key === 'revenue_evolution' && w.is_active)
  const donutChartWidget = widgets.find(w => w.instance_key === 'leads_by_source' && w.is_active)
  const funnelWidget = widgets.find(w => w.instance_key === 'conversion_funnel' && w.is_active)
  const tasksWidget = widgets.find(w => w.instance_key === 'recent_tasks' && w.is_active)
  const activitiesWidget = widgets.find(w => w.instance_key === 'recent_activities' && w.is_active)

  // Filter active widgets only for rendering
  const activeWidgets = widgets.filter(w => w.is_active)

  return (
    <div className="space-y-4">
      {/* KPI Row - responsive grid based on widget size */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiWidgets.map(widget => {
          const spanClass = sizeToSpan(widget.size)
          return (
            <div key={widget.id} className={spanClass}>
              <WidgetRenderer widget={widget} />
            </div>
          )
        })}
      </div>

      {/* Row 2: Charts - responsive layout based on widget size */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Bar Chart - medium or large size determines span */}
        {barChartWidget && (
          <div className={sizeToSpan(barChartWidget.size)}>
            <CardContainer className={barChartWidget.size === 'large' ? 'lg:col-span-3' : barChartWidget.size === 'medium' ? 'lg:col-span-2' : ''}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SectionLabel>{`▸ ${barChartWidget.title_override || barChartWidget.widget.title}`}</SectionLabel>
                  <SectionSubtitle>Oportunidades ganadas — últimos 6 meses</SectionSubtitle>
                </div>
                <span
                  className="text-[10px] font-mono font-bold text-[#E31E24] bg-[#E31E24]/10 px-2 py-1 rounded-sm tracking-widest"
                  style={{ textShadow: '0 0 8px rgba(227,30,36,0.5)' }}
                >
                  ₲ GS
                </span>
              </div>
              <WidgetRenderer widget={barChartWidget} />
            </CardContainer>
          </div>
        )}

        {/* Donut Chart */}
        {donutChartWidget && (
          <div className={sizeToSpan(donutChartWidget.size)}>
            <CardContainer>
              <div className="mb-3">
                <SectionLabel>{`▸ ${donutChartWidget.title_override || donutChartWidget.widget.title}`}</SectionLabel>
                <SectionSubtitle>Distribución por origen</SectionSubtitle>
              </div>
              <WidgetRenderer widget={donutChartWidget} />
            </CardContainer>
          </div>
        )}
      </div>

      {/* Funnel Chart - full width or based on size */}
      {funnelWidget && (
        <div className={sizeToSpan(funnelWidget.size)}>
          <CardContainer className={funnelWidget.size === 'large' ? 'lg:col-span-3' : ''}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionLabel>{`▸ ${funnelWidget.title_override || funnelWidget.widget.title}`}</SectionLabel>
                <SectionSubtitle>Oportunidades por etapa — tasa de conversión entre etapas</SectionSubtitle>
            </div>
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">conteo / conv%</span>
            </div>
            <WidgetRenderer widget={funnelWidget} />
          </CardContainer>
        </div>
      )}

      {/* Row 3: Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {tasksWidget && (
          <div className={sizeToSpan(tasksWidget.size)}>
            <WidgetRenderer widget={tasksWidget} />
          </div>
        )}
        {activitiesWidget && (
          <div className={sizeToSpan(activitiesWidget.size)}>
            <WidgetRenderer widget={activitiesWidget} />
          </div>
        )}
      </div>
    </div>
  )
}

export { DashboardGridServer }

export default async function DashboardGridServer({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardGrid userId={userId} />
    </Suspense>
  )
}