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
    <ProjectList
      initialProjects={projects as any[]}
      profiles={profiles}
      contacts={contacts.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name }))}
      companies={companies.map(c => ({ id: c.id, name: c.name }))}
    />
  )
}