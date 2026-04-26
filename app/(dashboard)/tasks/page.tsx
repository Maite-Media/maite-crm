import { getTasks } from '@/lib/actions/tasks'
import { TaskList } from '@/components/tasks/task-list'
import { createClient } from '@/lib/supabase/server'
import { getProfiles } from '@/lib/actions/profile'
import { getContacts } from '@/lib/actions/leads'
import { getCompanies } from '@/lib/actions/companies'
import { getOpportunitiesList } from '@/lib/actions/opportunities'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [tasksResult, profilesResult, contactsResult, companiesResult, opportunitiesResult] = await Promise.all([
    getTasks(),
    getProfiles(),
    getContacts(),
    getCompanies(),
    getOpportunitiesList(),
  ])

  const tasks = tasksResult.success ? tasksResult.data : []
  const profiles = profilesResult.success ? profilesResult.data : []
  const contacts = contactsResult.success ? contactsResult.data : []
  const companies = companiesResult.success ? companiesResult.data : []
  const opportunities = opportunitiesResult.success ? opportunitiesResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
        <p className="text-muted-foreground">
          Gestión de tareas y pendientes
        </p>
      </div>

      <TaskList
        initialTasks={tasks as any}
        currentUserId={user?.id}
        profiles={profiles}
        contacts={contacts}
        companies={companies}
        opportunities={opportunities}
      />
    </div>
  )
}
