import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DashboardGridServer } from '@/components/dashboard/dashboard-grid-server'
import { businessConfig } from '@/config/business-config'

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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div
      className="space-y-4"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
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

      {/* Dashboard Widgets - loaded from config (Server Component) */}
      {user?.id ? (
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <LoadingCard key={i} />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2"><LoadingCard /></div>
                <LoadingCard />
                <div className="lg:col-span-3"><LoadingCard /></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <LoadingCard />
                <LoadingCard />
              </div>
            </div>
          }
        >
          <DashboardGridServer userId={user.id} />
        </Suspense>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <LoadingCard key={i} />)}
        </div>
      )}
    </div>
  )
}