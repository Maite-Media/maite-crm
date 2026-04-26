import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/actions/profile'
import { getServices } from '@/lib/actions/services'
import { getPipelineStages } from '@/lib/actions/pipeline-config'
import { ProfileForm } from '@/components/settings/profile-form'
import { ServicesManager } from '@/components/settings/services-manager'
import { PipelineManager } from '@/components/settings/pipeline-manager'
import { TeamManager } from '@/components/settings/team-manager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersIcon } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let services: any[] = []
  let stages: any[] = []

  if (user) {
    const profileResult = await getProfile(user.id)
    if (profileResult.success) profile = profileResult.data

    const servicesResult = await getServices()
    if (servicesResult.success) services = servicesResult.data || []

    const stagesResult = await getPipelineStages()
    if (stagesResult.success) stages = stagesResult.data || []
  }

  // Hardcoded admin check — replace with real role check when auth is ready
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Ajustes del sistema y perfil de usuario
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team">Equipo</TabsTrigger>
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
      </Tabs>
    </div>
  )
}