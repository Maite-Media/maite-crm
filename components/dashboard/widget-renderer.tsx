'use server'

import { createClient } from '@/lib/supabase/server'
import { StatCard } from './stat-card'
import { MiniBarChart } from './mini-bar-chart'
import { DonutSource } from './donut-source'
import { HorizontalFunnel } from './horizontal-funnel'
import { RecentTasksList } from './recent-tasks-list'
import { RecentActivitiesList } from './recent-activities-list'
import type { DashboardLayoutItem } from '@/lib/actions/dashboard-workspace'
import type { Task } from '@/lib/actions/tasks'
import type { Activity } from '@/lib/actions/activities'
import { isValidWidgetType, getWidgetDefinition } from '@/lib/widgets/registry'
import { WidgetType } from '@/lib/widgets/types'

// ============================================
// DATA FETCHERS (server-side)
// ============================================

async function fetchKPIWidgetData(dataSource: string, metric: string, config: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  if (metric === 'pipeline_value') {
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('estimated_value, pipeline_stages(id, is_lost)')
    const total = opportunities?.reduce((sum, opp) => {
      const stage = (opp as Record<string, unknown>).pipeline_stages as { is_lost?: boolean } | null
      if (!stage?.is_lost && opp.estimated_value) {
        return sum + Number(opp.estimated_value)
      }
      return sum
    }, 0) || 0
    return { value: total, format: 'currency' }
  }

  const now = new Date()
  let dateFilter: string | null = null
  if ((config as Record<string, string>).dateRange === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    dateFilter = sevenDaysAgo
  }

  switch (dataSource) {
    case 'leads': {
      let query = supabase.from('contacts').select('*', { count: 'exact', head: true })
      if (dateFilter) query = query.gte('created_at', dateFilter)
      const { count } = await query
      return { value: count || 0 }
    }
    case 'opportunities': {
      const { data: opps } = await supabase
        .from('opportunities')
        .select('pipeline_stages(id, is_won, is_lost)')
      const active = opps?.filter(o => {
        const stage = (o as Record<string, unknown>).pipeline_stages as { is_won?: boolean; is_lost?: boolean } | null
        return stage && !stage.is_won && !stage.is_lost
      }).length || 0
      return { value: active }
    }
    case 'tasks': {
      let query = supabase.from('tasks').select('*', { count: 'exact', head: true })
      if (userId) query = query.eq('assigned_to', userId)
      query = query.in('status', ['pending', 'in_progress'])
      const { count } = await query
      return { value: count || 0 }
    }
    default:
      return { value: 0 }
  }
}

async function fetchBarChartData() {
  const supabase = await createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data } = await supabase
    .from('opportunities')
    .select('estimated_value, updated_at, pipeline_stages!opportunities_stage_id_fkey(is_won)')
    .gte('updated_at', sixMonthsAgo.toISOString())

  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const months: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
    months[key] = 0
  }

  data?.forEach(opp => {
    const stage = opp.pipeline_stages as { is_won?: boolean } | null
    if (stage?.is_won) {
      const d = new Date(opp.updated_at)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
      if (months[key] !== undefined) {
        months[key] += Number(opp.estimated_value) || 0
      }
    }
  })

  return Object.entries(months).map(([month, value]) => ({ month, value }))
}

async function fetchDonutChartData() {
  const supabase = await createClient()
  const { data } = await supabase.from('contacts').select('source')

  const sourceLabels: Record<string, string> = {
    web: 'Web', whatsapp: 'WhatsApp', linkedin: 'LinkedIn',
    referral: 'Referido', ad: 'Anuncio', call: 'Llamada', other: 'Otro',
  }

  const counts: Record<string, number> = {}
  data?.forEach(contact => {
    const source = contact.source || 'other'
    counts[source] = (counts[source] || 0) + 1
  })

  return Object.entries(counts).map(([source, value]) => ({
    name: sourceLabels[source] || source,
    value,
  }))
}

async function fetchFunnelData() {
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, position, is_won, is_lost')
    .order('position')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('stage_id')

  return stages?.map(stage => ({
    name: stage.name,
    count: opportunities?.filter(o => o.stage_id === stage.id).length || 0,
    is_won: stage.is_won,
    is_lost: stage.is_lost,
  })) || []
}

async function fetchListWidgetData(dataSource: string, config: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? ''
  const itemType = (config as Record<string, unknown>).itemType as string
  const limit = Number((config as Record<string, unknown>).limit) || 8

  if (itemType === 'tasks' || dataSource === 'tasks') {
    const { data } = await supabase
      .from('tasks')
      .select('*, contacts(first_name, last_name), companies(name), opportunities(title), profiles!tasks_assigned_to_fkey(full_name)')
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(limit)
    return { type: 'tasks', data: (data ?? []) as Task[] }
  }

  if (itemType === 'activities' || dataSource === 'activities') {
    const { data } = await supabase
      .from('activities')
      .select('*, profiles!activities_created_by_fkey(full_name), contacts(first_name, last_name), companies(name), opportunities(title)')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { type: 'activities', data: (data ?? []) as Activity[] }
  }

  return { type: 'tasks', data: [] }
}

// ============================================
// WIDGET RENDERER (Server Component)
// ============================================

interface WidgetRendererProps {
  widget: DashboardLayoutItem
}

export async function WidgetRenderer({ widget }: WidgetRendererProps) {
  const widgetType = widget.widget.type
  const title = widget.title_override || widget.widget.title

  switch (widgetType) {
    case 'KPI_CARD': {
      const kpiData = await fetchKPIWidgetData(widget.data_source, widget.metric, widget.config_json)

      // Determine icon based on data_source or instance_key pattern
      let iconName: 'Users' | 'Target' | 'CheckSquare' | 'TrendingUp' = 'TrendingUp'
      let iconBg = 'bg-[#E31E24]/15'
      let iconColor = 'text-[#E31E24]'

      // Check if it's a known instance_key pattern, otherwise use data_source for icon
      if (widget.instance_key.startsWith('custom_')) {
        // Custom widget - use data_source to determine icon
        switch (widget.data_source) {
          case 'leads':
          case 'contacts':
            iconName = 'Users'; iconBg = 'bg-blue-500/15'; iconColor = 'text-blue-400'
            break
          case 'opportunities':
            iconName = 'Target'; iconBg = 'bg-orange-500/15'; iconColor = 'text-orange-400'
            break
          case 'tasks':
            iconName = 'CheckSquare'; iconBg = 'bg-purple-500/15'; iconColor = 'text-purple-400'
            break
          case 'projects':
            iconName = 'TrendingUp'; iconBg = 'bg-green-500/15'; iconColor = 'text-green-400'
            break
          default:
            iconName = 'TrendingUp'; iconBg = 'bg-[#E31E24]/15'; iconColor = 'text-[#E31E24]'
        }
      } else {
        // Template widget - use instance_key mapping
        switch (widget.instance_key) {
          case 'leads_new_7d':
            iconName = 'Users'; iconBg = 'bg-blue-500/15'; iconColor = 'text-blue-400'
            break
          case 'active_opps':
            iconName = 'Target'; iconBg = 'bg-orange-500/15'; iconColor = 'text-orange-400'
            break
          case 'pending_tasks':
            iconName = 'CheckSquare'; iconBg = 'bg-[#E31E24]/15'; iconColor = 'text-[#E31E24]'
            break
          case 'pipeline_value':
            iconName = 'TrendingUp'; iconBg = 'bg-green-500/15'; iconColor = 'text-green-400'
            break
        }
      }

      const formatValue = (v: number) => {
        if ((widget.config_json as Record<string, string>).format === 'currency' || widget.instance_key === 'pipeline_value') {
          if (v >= 1000000) return `${Math.round(v / 1000000)}M`
          if (v >= 1000) return `${Math.round(v / 1000)}K`
          return `${v}`
        }
        return `${v}`
      }

      const subtitleMap: Record<string, string> = {
        leads_new_7d: 'Últimos 7 días',
        active_opps: 'En pipeline activo',
        pending_tasks: 'Sin completar',
        pipeline_value: 'Estimado total',
      }

      // For custom widgets, generate subtitle from data_source
      const getSubtitle = () => {
        if (subtitleMap[widget.instance_key]) return subtitleMap[widget.instance_key]
        if (widget.instance_key.startsWith('custom_')) {
          return widget.data_source.charAt(0).toUpperCase() + widget.data_source.slice(1)
        }
        return ''
      }

      return (
        <StatCard
          title={title}
          value={formatValue((kpiData.value as number) || 0)}
          iconName={iconName}
          iconBg={iconBg}
          iconColor={iconColor}
          subtitle={getSubtitle()}
        />
      )
    }

    case 'BAR_CHART': {
      const chartData = await fetchBarChartData()
      return <MiniBarChart data={chartData} />
    }

    case 'DONUT_CHART': {
      const chartData = await fetchDonutChartData()
      return <DonutSource data={chartData} />
    }

    case 'FUNNEL_CHART': {
      const funnelData = await fetchFunnelData()
      return <HorizontalFunnel data={funnelData} />
    }

    case 'LIST_WIDGET': {
      const listData = await fetchListWidgetData(widget.data_source, widget.config_json)
      if (listData.type === 'tasks') {
        return <RecentTasksList tasks={listData.data as Task[]} />
      }
      return <RecentActivitiesList activities={listData.data as Activity[]} />
    }

    default:
      // Fallback for unknown widget types
      return (
        <div style={{ padding: '1rem', background: '#1a1a1a', border: '1px solid #E31E24', borderRadius: '2px' }}>
          <p style={{ color: '#E31E24', fontFamily: 'monospace', fontSize: '11px' }}>
            Widget no reconocido: {widgetType}
          </p>
          <p style={{ color: '#71717a', fontFamily: 'monospace', fontSize: '10px', marginTop: '4px' }}>
            instance_key: {widget.instance_key}
          </p>
        </div>
      )
  }
}