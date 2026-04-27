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

  const pendingCount = tasks?.filter((t: { status: string }) => t.status === 'pending' || t.status === 'in_progress').length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-8 bg-[#E31E24]" style={{ boxShadow: '0 0 8px rgba(227,30,36,0.6)' }} />
        <div>
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Módulo 05</p>
          <h1 className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-snug" style={{ textShadow: '0 0 16px rgba(227,30,36,0.25)' }}>
            Tareas
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[9px] font-mono text-[#E31E24] bg-[#E31E24]/10 px-2 py-0.5 uppercase tracking-wider">
              {pendingCount} pendientes
            </span>
          )}
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            {tasks?.length ?? 0} total
          </span>
        </div>
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
