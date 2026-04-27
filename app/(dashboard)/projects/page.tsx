import { getProjects } from '@/lib/actions/projects'
import { getProfiles } from '@/lib/actions/profile'
import { getContacts } from '@/lib/actions/leads'
import { getCompanies } from '@/lib/actions/companies'
import { ProjectList } from '@/components/projects/project-list'

export default async function ProjectsPage() {
  const [projectsResult, profilesResult, contactsResult, companiesResult] = await Promise.all([
    getProjects(),
    getProfiles(),
    getContacts(),
    getCompanies(),
  ])

  const projects = projectsResult.success ? projectsResult.data ?? [] : []
  const profiles = profilesResult.success ? profilesResult.data ?? [] : []
  const contacts = contactsResult.success ? contactsResult.data ?? [] : []
  const companies = companiesResult.success ? companiesResult.data ?? [] : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-8 bg-[#E31E24]" style={{ boxShadow: '0 0 8px rgba(227,30,36,0.6)' }} />
        <div>
          <p className="text-[9px] font-mono tracking-[0.35em] text-zinc-600 uppercase leading-none">Módulo 06</p>
          <h1 className="text-lg font-mono font-bold text-white tracking-widest uppercase leading-snug" style={{ textShadow: '0 0 16px rgba(227,30,36,0.25)' }}>
            Proyectos
          </h1>
        </div>
        <div className="ml-auto">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
            {projects.length} activos
          </span>
        </div>
      </div>
      <ProjectList
        initialProjects={projects as any[]}
        profiles={profiles}
        contacts={contacts.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name }))}
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}