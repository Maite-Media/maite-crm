import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/actions/profile'
import { getServices } from '@/lib/actions/services'
import { getWorkspacePipelineStages } from '@/lib/actions/pipeline-actions'
import { getDashboardBuilderConfig } from '@/lib/actions/dashboard-builder'
import { ProfileForm } from '@/components/settings/profile-form'
import { ServicesManager } from '@/components/settings/services-manager'
import { PipelineManager } from '@/components/settings/pipeline-manager'
import { TeamManager } from '@/components/settings/team-manager'
import { DashboardBuilder } from '@/components/settings/dashboard-builder'
import { DashboardTemplateSelector } from '@/components/settings/dashboard-template-selector'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersIcon } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let services: any[] = []
  let stages: any[] = []
  let dashboardBuilderData: any[] = []
  let isWorkspaceAdmin = false
  let currentTemplateSlug: string | undefined

  if (user) {
    const profileResult = await getProfile(user.id)
    if (profileResult.success) profile = profileResult.data

    const servicesResult = await getServices()
    if (servicesResult.success) services = servicesResult.data || []

    const stagesResult = await getWorkspacePipelineStages()
    if (stagesResult.success) stages = stagesResult.data || []

    // Check workspace membership for dashboard builder
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle()

    isWorkspaceAdmin = !!member

    // Fetch dashboard builder config if user is admin/owner
    if (isWorkspaceAdmin) {
      const builderResult = await getDashboardBuilderConfig()
      if (builderResult.success) {
        dashboardBuilderData = builderResult.data || []
      }

      // Get current active template slug from dashboard_settings
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const workspaceId = memberData?.workspace_id

      if (workspaceId) {
        const { data: dashboardSettings } = await supabase
          .from('dashboard_settings')
          .select('active_template_id')
          .eq('workspace_id', workspaceId)
          .single()

        const activeTemplateId = dashboardSettings?.active_template_id

        if (activeTemplateId) {
          const { data: template } = await supabase
            .from('dashboard_templates')
            .select('slug')
            .eq('id', activeTemplateId)
            .single()
          currentTemplateSlug = template?.slug
        }
      }
    }
  }

  // Hardcoded admin check — replace with real role check when auth is ready
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-8 bg-[#E31E24]" style={{ boxShadow: '0 0 8px rgba(227,30,36,0.6)' }} />
        <div>
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Módulo 07</p>
          <h1 className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-snug" style={{ textShadow: '0 0 16px rgba(227,30,36,0.25)' }}>
            Configuración
          </h1>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team">Equipo</TabsTrigger>
          )}
          {isWorkspaceAdmin && (
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          {profile ? (
            <ProfileForm profile={profile} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Cargando perfil...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <ServicesManager initialServices={services} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineManager initialStages={stages} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team" className="mt-4">
            <TeamManager />
          </TabsContent>
        )}
        {isWorkspaceAdmin && (
          <TabsContent value="dashboard" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-zinc-300">
                  Dashboard Builder
                </CardTitle>
                <CardDescription className="text-xs font-mono text-zinc-500">
                  Personalizá los widgets de tu dashboard. Los cambios se reflejan inmediatamente en /dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardBuilder initialData={dashboardBuilderData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-zinc-300">
                  Templates
                </CardTitle>
                <CardDescription className="text-xs font-mono text-zinc-500">
                  Aplicá un template para reconfigurar todos los widgets del dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardTemplateSelector currentTemplateSlug={currentTemplateSlug} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}