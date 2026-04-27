import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics, getRecentTasks, getRecentActivities } from '@/lib/actions/dashboard'
import { getRevenueByMonth, getOpportunitiesByStageCount, getLeadsBySource } from '@/lib/actions/dashboard-charts'
import { StatCard } from '@/components/dashboard/stat-card'
import { MiniBarChart } from '@/components/dashboard/mini-bar-chart'
import { HorizontalFunnel } from '@/components/dashboard/horizontal-funnel'
import { DonutSource } from '@/components/dashboard/donut-source'
import { RecentTasksList } from '@/components/dashboard/recent-tasks-list'
import { RecentActivitiesList } from '@/components/dashboard/recent-activities-list'
import { PipelineSummaryCard } from '@/components/dashboard/pipeline-summary-card'
import { Users, Target, CheckSquare, TrendingUp } from 'lucide-react'
import { businessConfig } from '@/config/business-config'

function formatCurrency(value: number): string {
  if (value >= 1000000) return `₲${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₲${(value / 1000).toFixed(0)}K`
  return `₲${value}`
}

function LoadingCard() {
  return <div className="bg-background border rounded-xl p-4 animate-pulse h-24" />
}

function LoadingChart() {
  return <div className="bg-background border rounded-xl p-4 animate-pulse h-48" />
}

async function DashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const result = await getDashboardMetrics(user?.id)
  const data = result.data ?? { newLeads: 0, activeOpportunities: 0, pendingTasks: 0, estimatedRevenue: 0 }
  const userId = user?.id ?? ''

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        title="Leads nuevos (7 días)"
        value={String(data.newLeads)}
        icon={Users}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        subtitle="Últimos 7 días"
      />
      <StatCard
        title="Oportunidades activas"
        value={String(data.activeOpportunities)}
        icon={Target}
        iconBg="bg-orange-50"
        iconColor="text-orange-600"
        subtitle="En pipeline"
      />
      <StatCard
        title="Tareas pendientes"
        value={String(data.pendingTasks)}
        icon={CheckSquare}
        iconBg="bg-red-50"
        iconColor="text-red-600"
        subtitle="Sin completar"
      />
      <StatCard
        title="Valor pipeline"
        value={formatCurrency(data.estimatedRevenue)}
        icon={TrendingUp}
        iconBg="bg-green-50"
        iconColor="text-green-600"
        subtitle="Oportunidades activas"
      />
    </div>
  )
}

async function DashboardCharts() {
  const [revenue, funnel, sources] = await Promise.all([
    getRevenueByMonth(),
    getOpportunitiesByStageCount(),
    getLeadsBySource(),
  ])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Ingresos - 2/3 del ancho */}
      <div className="lg:col-span-2 bg-background border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">Evolución de ingresos</p>
            <p className="text-xs text-muted-foreground">Oportunidades ganadas — últimos 6 meses</p>
          </div>
          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">₲</span>
        </div>
        <MiniBarChart data={revenue} />
      </div>

      {/* Leads por fuente - 1/3 */}
      <div className="bg-background border rounded-xl p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold">Leads por fuente</p>
          <p className="text-xs text-muted-foreground">Origen de contactos</p>
        </div>
        <DonutSource data={sources} />
      </div>

      {/* Funnel - ancho completo */}
      <div className="lg:col-span-3 bg-background border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">Funnel de conversión</p>
            <p className="text-xs text-muted-foreground">Oportunidades por etapa del pipeline</p>
          </div>
        </div>
        <HorizontalFunnel data={funnel} />
      </div>
    </div>
  )
}

async function DashboardBottom() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? ''
  const [tasksResult, activitiesResult] = await Promise.all([
    getRecentTasks(userId, 5),
    getRecentActivities(10),
  ])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RecentTasksList tasks={tasksResult.data ?? []} />
      <RecentActivitiesList activities={activitiesResult.data ?? []} />
    </div>
  )
}

export default async function DashboardPage() {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Bienvenido al panel de control de {businessConfig.name}</p>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <LoadingCard key={i} />)}
        </div>
      }>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<LoadingChart />}>
        <DashboardCharts />
      </Suspense>

      <Suspense fallback={<LoadingChart />}>
        <DashboardBottom />
      </Suspense>
    </div>
  )
}