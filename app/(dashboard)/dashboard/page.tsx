import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics, getRecentTasks, getRecentActivities, getPipelineSummary } from '@/lib/actions/dashboard'
import { MetricCard } from '@/components/dashboard/metric-card'
import { RecentTasksList } from '@/components/dashboard/recent-tasks-list'
import { RecentActivitiesList } from '@/components/dashboard/recent-activities-list'
import { PipelineSummaryCard } from '@/components/dashboard/pipeline-summary-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, CheckSquare, Coins } from 'lucide-react'
import { businessConfig } from '@/config/business-config'

function formatCurrency(value: number): string {
  return `${businessConfig.currencySymbol}${value.toLocaleString('es-PY')}`
}

async function DashboardMetrics() {
  const { data: metrics } = await getDashboardMetrics()
  const metricsData = metrics || { newLeads: 0, activeOpportunities: 0, estimatedRevenue: 0, pendingTasks: 0 }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Leads nuevos (7 días)"
        value={metricsData.newLeads}
        icon={Users}
        iconColor="blue"
      />
      <MetricCard
        title="Oportunidades activas"
        value={metricsData.activeOpportunities}
        icon={Target}
        iconColor="orange"
      />
      <MetricCard
        title="Tareas pendientes"
        value={metricsData.pendingTasks}
        icon={CheckSquare}
        iconColor="red"
      />
      <MetricCard
        title="Valor pipeline"
        value={formatCurrency(metricsData.estimatedRevenue)}
        icon={Coins}
        iconColor="green"
      />
    </div>
  )
}

async function DashboardPipelineSummary() {
  const { data: summary } = await getPipelineSummary()
  return <PipelineSummaryCard stages={summary || []} />
}

async function DashboardTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || ''

  const { data: tasks } = await getRecentTasks(userId, 5)
  return <RecentTasksList tasks={tasks || []} />
}

async function DashboardActivities() {
  const { data: activities } = await getRecentActivities(10)
  return <RecentActivitiesList activities={activities || []} />
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground animate-pulse">
          Cargando...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold animate-pulse text-muted-foreground">--</div>
      </CardContent>
    </Card>
  )
}

function LoadingList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base animate-pulse">Cargando...</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground animate-pulse">
          Cargando...
        </p>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de control de {businessConfig.name}
        </p>
      </div>

      <Suspense fallback={
<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      }>
        <DashboardMetrics />
      </Suspense>

      <Suspense fallback={<LoadingCard />}>
        <DashboardPipelineSummary />
      </Suspense>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Suspense fallback={<LoadingList />}>
          <DashboardTasks />
        </Suspense>
        <Suspense fallback={<LoadingList />}>
          <DashboardActivities />
        </Suspense>
      </div>
    </div>
  )
}