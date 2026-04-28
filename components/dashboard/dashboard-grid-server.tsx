import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserDashboardLayout } from '@/lib/actions/dashboard-workspace'
import { WidgetRenderer } from './widget-renderer'
import { CardContainer, SectionLabel, SectionSubtitle } from './dashboard-ui'
import { LoadingCard, LoadingChart } from './dashboard-ui'
import type { WidgetType } from '@/lib/widgets/types'

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

// Chart type labels
const chartSubtitles: Record<string, string> = {
  BAR_CHART: 'Evolución — últimos 6 meses',
  DONUT_CHART: 'Distribución por categoría',
  FUNNEL_CHART: 'Oportunidades por etapa — tasa de conversión',
  LIST_WIDGET: 'Items recientes',
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

  // Filter active widgets
  const activeWidgets = widgets.filter(w => w.is_active)

  // Separate by widget type
  const kpiWidgets = activeWidgets.filter(w => w.widget.type === 'KPI_CARD')
  const barCharts = activeWidgets.filter(w => w.widget.type === 'BAR_CHART')
  const donutCharts = activeWidgets.filter(w => w.widget.type === 'DONUT_CHART')
  const funnels = activeWidgets.filter(w => w.widget.type === 'FUNNEL_CHART')
  const listWidgets = activeWidgets.filter(w => w.widget.type === 'LIST_WIDGET')

  // Sort by position for consistent ordering
  const sortByPosition = (arr: typeof activeWidgets) =>
    [...arr].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      {/* Row 1: KPI Cards - responsive grid based on widget size */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sortByPosition(kpiWidgets).map(widget => {
          const spanClass = sizeToSpan(widget.size)
          return (
            <div key={widget.id} className={spanClass}>
              <WidgetRenderer widget={widget} />
            </div>
          )
        })}
      </div>

      {/* Row 2: Bar Charts */}
      {sortByPosition(barCharts).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {sortByPosition(barCharts).map((widget, idx) => (
            <div key={widget.id} className={sizeToSpan(widget.size)}>
              <CardContainer className={widget.size === 'large' ? 'lg:col-span-3' : widget.size === 'medium' ? 'lg:col-span-2' : ''}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <SectionLabel>{`▸ ${widget.title_override || widget.widget.title}`}</SectionLabel>
                    <SectionSubtitle>{chartSubtitles[widget.widget.type] || 'Gráfico'}</SectionSubtitle>
                  </div>
                  {idx === 0 && (
                    <span
                      className="text-[10px] font-mono font-bold text-[#E31E24] bg-[#E31E24]/10 px-2 py-1 rounded-sm tracking-widest"
                      style={{ textShadow: '0 0 8px rgba(227,30,36,0.5)' }}
                    >
                      ₲ GS
                    </span>
                  )}
                </div>
                <WidgetRenderer widget={widget} />
              </CardContainer>
            </div>
          ))}
        </div>
      )}

      {/* Row 3: Donut Charts */}
      {sortByPosition(donutCharts).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {sortByPosition(donutCharts).map(widget => (
            <div key={widget.id} className={sizeToSpan(widget.size)}>
              <CardContainer>
                <div className="mb-3">
                  <SectionLabel>{`▸ ${widget.title_override || widget.widget.title}`}</SectionLabel>
                  <SectionSubtitle>{chartSubtitles[widget.widget.type] || 'Gráfico'}</SectionSubtitle>
                </div>
                <WidgetRenderer widget={widget} />
              </CardContainer>
            </div>
          ))}
        </div>
      )}

      {/* Row 4: Funnel Charts - full width */}
      {sortByPosition(funnels).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {sortByPosition(funnels).map(widget => (
            <div key={widget.id} className={sizeToSpan(widget.size)}>
              <CardContainer className={widget.size === 'large' ? 'lg:col-span-3' : ''}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <SectionLabel>{`▸ ${widget.title_override || widget.widget.title}`}</SectionLabel>
                    <SectionSubtitle>{chartSubtitles[widget.widget.type] || 'Gráfico'}</SectionSubtitle>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">conteo / conv%</span>
                </div>
                <WidgetRenderer widget={widget} />
              </CardContainer>
            </div>
          ))}
        </div>
      )}

      {/* Row 5: List Widgets */}
      {sortByPosition(listWidgets).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortByPosition(listWidgets).map(widget => (
            <div key={widget.id} className={sizeToSpan(widget.size)}>
              <WidgetRenderer widget={widget} />
            </div>
          ))}
        </div>
      )}
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