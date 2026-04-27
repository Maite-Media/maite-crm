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
import { businessConfig } from '@/config/business-config'

function formatCurrency(value: number): string {
  if (value >= 1000000) return `₲${Math.round(value / 1000000)}M`
  if (value >= 1000) return `₲${Math.round(value / 1000)}K`
  return `₲${value}`
}

function LoadingCard() {
  return (
    <div className="relative bg-[#111111] border border-white/5 rounded-sm p-4 animate-pulse h-24 overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/30" />
    </div>
  )
}

function LoadingChart() {
  return (
    <div className="relative bg-[#111111] border border-white/5 rounded-sm p-5 animate-pulse h-52 overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/30" />
    </div>
  )
}

function CardContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-[#111111] border border-white/5 rounded-sm p-5 overflow-hidden hover:border-white/10 transition-colors ${className}`}>
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#E31E24]/50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#E31E24]/50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#E31E24]/50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#E31E24]/50" />
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">{children}</p>
  )
}

function SectionSubtitle({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{children}</p>
  )
}

async function DashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const result = await getDashboardMetrics(user?.id)
  const data = result.data ?? { newLeads: 0, activeOpportunities: 0, pendingTasks: 0, estimatedRevenue: 0 }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        title="Leads nuevos"
        value={String(data.newLeads)}
        iconName="Users"
        iconBg="bg-blue-500/15"
        iconColor="text-blue-400"
        subtitle="Últimos 7 días"
      />
      <StatCard
        title="Oportunidades"
        value={String(data.activeOpportunities)}
        iconName="Target"
        iconBg="bg-orange-500/15"
        iconColor="text-orange-400"
        subtitle="En pipeline activo"
      />
      <StatCard
        title="Tareas pendientes"
        value={String(data.pendingTasks)}
        iconName="CheckSquare"
        iconBg="bg-[#E31E24]/15"
        iconColor="text-[#E31E24]"
        subtitle="Sin completar"
      />
      <StatCard
        title="Valor pipeline"
        value={formatCurrency(data.estimatedRevenue)}
        iconName="TrendingUp"
        iconBg="bg-green-500/15"
        iconColor="text-green-400"
        subtitle="Estimado total"
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <CardContainer className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionLabel>▸ Evolución de ingresos</SectionLabel>
            <SectionSubtitle>Oportunidades ganadas — últimos 6 meses</SectionSubtitle>
          </div>
          <span
            className="text-[10px] font-mono font-bold text-[#E31E24] bg-[#E31E24]/10 px-2 py-1 rounded-sm tracking-widest"
            style={{ textShadow: '0 0 8px rgba(227,30,36,0.5)' }}
          >
            ₲ GS
          </span>
        </div>
        <MiniBarChart data={revenue} />
      </CardContainer>

      <CardContainer>
        <div className="mb-3">
          <SectionLabel>▸ Leads por fuente</SectionLabel>
          <SectionSubtitle>Distribución por origen</SectionSubtitle>
        </div>
        <DonutSource data={sources} />
      </CardContainer>

      <CardContainer className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionLabel>▸ Funnel de conversión</SectionLabel>
            <SectionSubtitle>Oportunidades por etapa — tasa de conversión entre etapas</SectionSubtitle>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">conteo / conv%</span>
        </div>
        <HorizontalFunnel data={funnel} />
      </CardContainer>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <RecentTasksList tasks={tasksResult.data ?? []} />
      <RecentActivitiesList activities={activitiesResult.data ?? []} />
    </div>
  )
}

export default async function DashboardPage() {
  return (
    <div
      className="relative -m-4 lg:-m-6 p-4 lg:p-6 space-y-4"
      style={{
        backgroundColor: '#080808',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div
          className="w-0.5 h-9 bg-[#E31E24] rounded-full"
          style={{ boxShadow: '0 0 10px #E31E24, 0 0 20px rgba(227,30,36,0.4)' }}
        />
        <div>
          <p className="text-[9px] font-mono tracking-[0.4em] text-zinc-600 uppercase">
            {businessConfig.name} / Sistema
          </p>
          <h1
            className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-none mt-0.5"
            style={{ textShadow: '0 0 20px rgba(227,30,36,0.3)' }}
          >
            Dashboard
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px #22c55e' }} />
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Online</span>
        </div>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <LoadingCard key={i} />)}
        </div>
      }>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2"><LoadingChart /></div>
          <LoadingChart />
          <div className="lg:col-span-3"><LoadingChart /></div>
        </div>
      }>
        <DashboardCharts />
      </Suspense>

      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LoadingChart />
          <LoadingChart />
        </div>
      }>
        <DashboardBottom />
      </Suspense>
    </div>
  )
}
